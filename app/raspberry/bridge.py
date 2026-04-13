#!/usr/bin/env python3
"""bridge.py — Raspberry Pi : pont MQTT (ESP32) ↔ WebSocket (App React)

Flux complet :
  ESP32  →[MQTT publish]→  Mosquitto  →[paho subscribe]→  bridge.py
  bridge.py →[WebSocket push]→  App React (mobile)
  App React →[WebSocket send]→  bridge.py →[MQTT publish]→  ESP32
"""

import asyncio
import json
import logging
import os
import signal
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
import websockets
from websockets.server import WebSocketServerProtocol

# ---------------------------------------------------------------------------
# Config — surchargeable via variables d'environnement (Docker)
# ---------------------------------------------------------------------------
MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT   = int(os.environ.get("MQTT_PORT", 1883))
MQTT_TOPICS = [
    ("catfeeder/feed",      0),   # ESP32 publie quand il distribue
    ("catfeeder/reservoir", 0),   # ESP32 publie le niveau du réservoir
    ("catfeeder/status",    0),   # ESP32 publie son état (online/offline)
]
WS_HOST = os.environ.get("WS_HOST", "0.0.0.0")   # écoute sur toutes les interfaces
WS_PORT = int(os.environ.get("WS_PORT", 8765))

_default_db = Path(__file__).parent / "catfeeder.db"
DB_PATH = Path(os.environ.get("DB_PATH", str(_default_db)))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("bridge")

# ---------------------------------------------------------------------------
# Base de données SQLite — persistance des historiques
# ---------------------------------------------------------------------------
def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS feed_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            portionGrams INTEGER NOT NULL
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS fill_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            filledByUser TEXT NOT NULL
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS reservoir (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            levelPercent INTEGER NOT NULL DEFAULT 0,
            isEmpty INTEGER NOT NULL DEFAULT 1,
            lastUpdated TEXT NOT NULL
        )
    """)
    # Insérer une ligne réservoir si elle n'existe pas
    con.execute("""
        INSERT OR IGNORE INTO reservoir (id, levelPercent, isEmpty, lastUpdated)
        VALUES (1, 0, 1, ?)
    """, (_now_iso(),))
    con.commit()
    con.close()
    log.info(f"Base de données : {DB_PATH}")

def db_load_state() -> dict:
    """Charge l'état complet depuis SQLite au démarrage."""
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    row = con.execute("SELECT * FROM reservoir WHERE id = 1").fetchone()
    reservoir = {
        "levelPercent": row["levelPercent"],
        "isEmpty":      bool(row["isEmpty"]),
        "lastUpdated":  row["lastUpdated"],
    }

    feeds = con.execute(
        "SELECT * FROM feed_events ORDER BY timestamp DESC LIMIT 50"
    ).fetchall()
    feed_history = [
        {"id": r["id"], "timestamp": r["timestamp"], "portionGrams": r["portionGrams"]}
        for r in feeds
    ]

    fills = con.execute(
        "SELECT * FROM fill_events ORDER BY timestamp DESC LIMIT 50"
    ).fetchall()
    fill_history = [
        {"id": r["id"], "timestamp": r["timestamp"], "filledByUser": r["filledByUser"]}
        for r in fills
    ]

    con.close()
    return {
        "isOnline":    False,
        "reservoir":   reservoir,
        "feedHistory": feed_history,
        "fillHistory": fill_history,
    }

def db_save_feed(event: dict):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT OR REPLACE INTO feed_events (id, timestamp, portionGrams) VALUES (?, ?, ?)",
        (event["id"], event["timestamp"], event["portionGrams"])
    )
    con.commit(); con.close()

def db_save_fill(event: dict):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT OR REPLACE INTO fill_events (id, timestamp, filledByUser) VALUES (?, ?, ?)",
        (event["id"], event["timestamp"], event["filledByUser"])
    )
    con.commit(); con.close()

def db_save_reservoir(reservoir: dict):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "UPDATE reservoir SET levelPercent=?, isEmpty=?, lastUpdated=? WHERE id=1",
        (reservoir["levelPercent"], int(reservoir["isEmpty"]), reservoir["lastUpdated"])
    )
    con.commit(); con.close()

# ---------------------------------------------------------------------------
# État en mémoire (chargé depuis SQLite au démarrage)
# ---------------------------------------------------------------------------
state: dict = {}
state_lock = threading.Lock()

# Clients WebSocket connectés
ws_clients: set[WebSocketServerProtocol] = set()
ws_lock = threading.Lock()
ws_loop: asyncio.AbstractEventLoop | None = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    # Format Z (pas +00:00) pour compatibilité avec JS new Date()
    now = datetime.now(timezone.utc)
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + f"{now.microsecond // 1000:03d}Z"

def _new_id() -> str:
    return str(int(datetime.now().timestamp() * 1000))

def _ws_broadcast(message: dict):
    """Envoie un message JSON à tous les clients WebSocket (thread-safe)."""
    if ws_loop is None:
        return
    payload = json.dumps(message, ensure_ascii=False)
    asyncio.run_coroutine_threadsafe(_broadcast_async(payload), ws_loop)

async def _broadcast_async(payload: str):
    dead = set()
    with ws_lock:
        clients = set(ws_clients)
    for client in clients:
        try:
            await client.send(payload)
        except websockets.exceptions.ConnectionClosed:
            dead.add(client)
    with ws_lock:
        ws_clients.difference_update(dead)

# ---------------------------------------------------------------------------
# MQTT callbacks
# ---------------------------------------------------------------------------
def on_connect(client, _userdata, _flags, rc):
    if rc == 0:
        log.info("✅ MQTT connecté au broker Mosquitto")
        for topic, qos in MQTT_TOPICS:
            client.subscribe(topic, qos)
            log.info(f"   📡 souscrit : {topic}")
        with state_lock:
            state["isOnline"] = True
        _ws_broadcast({"type": "state", "payload": dict(state)})
    else:
        codes = {1:"protocole",2:"client_id",3:"broker indispo",4:"credentials",5:"non autorisé"}
        log.error(f"❌ MQTT refusé : {codes.get(rc, rc)}")

def on_disconnect(client, _userdata, rc):
    log.warning(f"⚠️  MQTT déconnecté (rc={rc}), tentative de reconnexion…")
    with state_lock:
        state["isOnline"] = False
    _ws_broadcast({"type": "reservoir", "payload": {**state["reservoir"], "isOnline": False}})

def on_message(_client, _userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        log.warning(f"Payload non-JSON sur {topic} : {msg.payload}")
        return

    log.info(f"📨 MQTT ← {topic} : {payload}")

    with state_lock:
        # ── Repas distribué par l'ESP32 ───────────────────────────────────
        if topic == "catfeeder/feed":
            portion_grams = int(payload.get("portionGrams", 40))
            event = {
                "id":           _new_id(),
                "timestamp":    payload.get("timestamp", _now_iso()),
                "portionGrams": portion_grams,
            }
            state["feedHistory"].insert(0, event)
            state["feedHistory"] = state["feedHistory"][:50]
            db_save_feed(event)

            # Décrémenter le niveau du réservoir (estimation : 40g = ~5%)
            percent_to_deduct = int(portion_grams / 8) # 40g -> 5%
            new_level = max(0, state["reservoir"]["levelPercent"] - percent_to_deduct)
            
            # Si le capteur dit que c'est vide, on force à 0
            is_empty = state["reservoir"]["isEmpty"]
            if is_empty:
                new_level = 0
            
            reservoir = {
                "levelPercent": new_level,
                "isEmpty":      new_level == 0 or is_empty,
                "lastUpdated":  _now_iso(),
            }
            state["reservoir"] = reservoir
            db_save_reservoir(reservoir)

            _ws_broadcast({"type": "feed_event", "payload": event})
            _ws_broadcast({"type": "reservoir", "payload": reservoir})
            log.info(f"🍽  Repas enregistré : {portion_grams}g. Réservoir estimé à {new_level}%")

        # ── Niveau réservoir mis à jour par l'ESP32 ───────────────────────
        elif topic == "catfeeder/reservoir":
            reservoir = {
                "levelPercent": int(payload.get("levelPercent", 0)),
                "isEmpty":      bool(payload.get("isEmpty", False)),
                "lastUpdated":  _now_iso(),
            }
            state["reservoir"] = reservoir
            db_save_reservoir(reservoir)
            _ws_broadcast({"type": "reservoir", "payload": reservoir})
            log.info(f"📦 Réservoir : {reservoir['levelPercent']}%")

        # ── Statut ESP32 (last will / online) ────────────────────────────
        elif topic == "catfeeder/status":
            online = payload.get("online", False)
            state["isOnline"] = online
            _ws_broadcast({"type": "state", "payload": {"isOnline": online}})
            log.info(f"{'🟢' if online else '🔴'} ESP32 {'en ligne' if online else 'hors ligne'}")

# ---------------------------------------------------------------------------
# WebSocket server
# ---------------------------------------------------------------------------
async def ws_handler(websocket: WebSocketServerProtocol):
    with ws_lock:
        ws_clients.add(websocket)
    remote = websocket.remote_address
    log.info(f"📱 App connectée : {remote}")

    # Envoyer l'état complet immédiatement à ce nouveau client
    with state_lock:
        snapshot = dict(state)
    await websocket.send(json.dumps({"type": "state", "payload": snapshot}, ensure_ascii=False))

    try:
        async for raw in websocket:
            try:
                msg      = json.loads(raw)
                msg_type = msg.get("type")
                payload  = msg.get("payload", {})

                # ── Commande : distribuer ──────────────────────────────────
                if msg_type == "feed_event":
                    grams = int(payload.get("portionGrams", 40))
                    mqtt_client.publish(
                        "catfeeder/cmd/feed",
                        json.dumps({"portionGrams": grams}),
                    )
                    log.info(f"[ACTION UTILISATEUR] 👆 Commande distribution UI → ESP32 : {grams}g")

                # ── Commande : remplissage confirmé par l'utilisateur ──────
                elif msg_type == "fill_event":
                    filled_by = payload.get("filledByUser", "Utilisateur")
                    fill_event = {
                        "id":           _new_id(),
                        "timestamp":    _now_iso(),
                        "filledByUser": filled_by,
                    }
                    reservoir_full = {
                        "levelPercent": 100,
                        "isEmpty":      False,
                        "lastUpdated":  _now_iso(),
                    }
                    with state_lock:
                        state["fillHistory"].insert(0, fill_event)
                        state["fillHistory"] = state["fillHistory"][:50]
                        state["reservoir"]   = reservoir_full
                    db_save_fill(fill_event)
                    db_save_reservoir(reservoir_full)
                    mqtt_client.publish("catfeeder/cmd/fill", json.dumps({}))
                    _ws_broadcast({"type": "fill_event", "payload": fill_event})
                    _ws_broadcast({"type": "reservoir",  "payload": reservoir_full})
                    log.info(f"[ACTION UTILISATEUR] ✅ Réservoir rempli via UI par {filled_by}")

            except (json.JSONDecodeError, KeyError, ValueError) as e:
                log.warning(f"Message WS invalide : {e}")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        with ws_lock:
            ws_clients.discard(websocket)
        log.info(f"📱 App déconnectée : {remote}")

# ---------------------------------------------------------------------------
# Ping keepalive — évite les déconnexions WebSocket sur mobile
# ---------------------------------------------------------------------------
async def keepalive():
    while True:
        await asyncio.sleep(30)
        payload = json.dumps({"type": "ping", "payload": {}})
        with ws_lock:
            clients = set(ws_clients)
        dead = set()
        for client in clients:
            try:
                await client.send(payload)
            except websockets.exceptions.ConnectionClosed:
                dead.add(client)
        with ws_lock:
            ws_clients.difference_update(dead)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
mqtt_client = mqtt.Client(
    client_id="catfeeder-bridge",
    protocol=mqtt.MQTTv311,
    clean_session=True,
)
mqtt_client.on_connect    = on_connect
mqtt_client.on_disconnect = on_disconnect
mqtt_client.on_message    = on_message
# Reconnexion automatique
mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

async def main():
    global ws_loop
    ws_loop = asyncio.get_running_loop()

    # Initialiser SQLite
    init_db()

    # Charger l'état depuis la base
    global state
    state = db_load_state()
    log.info(f"📂 Historique chargé : {len(state['feedHistory'])} repas, {len(state['fillHistory'])} remplissages")

    # Démarrer MQTT dans un thread dédié
    mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
    mqtt_client.loop_start()

    # Démarrer le serveur WebSocket + keepalive
    log.info(f"🚀 WebSocket démarré sur ws://0.0.0.0:{WS_PORT}")
    async with websockets.serve(ws_handler, WS_HOST, WS_PORT):
        loop = asyncio.get_event_loop()
        stop = loop.create_future()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, stop.set_result, None)
            except NotImplementedError:
                pass  # Windows ne supporte pas add_signal_handler

        asyncio.create_task(keepalive())
        log.info("✅ Bridge opérationnel — Ctrl+C pour arrêter")
        await stop

    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    log.info("👋 Bridge arrêté proprement")

if __name__ == "__main__":
    asyncio.run(main())

