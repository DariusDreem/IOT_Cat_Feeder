#!/usr/bin/env python3
"""
test_bridge.py — Simule un ESP32 pour tester le bridge sans matériel.
Lance ce script pendant que le bridge tourne (Docker ou direct).

Usage :
    python3 test_bridge.py                 # broker sur localhost
    python3 test_bridge.py 192.168.1.42    # broker sur une autre IP
"""

import json
import sys
import time
import random
import paho.mqtt.client as mqtt

BROKER = sys.argv[1] if len(sys.argv) > 1 else "localhost"
PORT   = 1883

# ── Callback : commandes reçues depuis l'app (via bridge → MQTT) ──────────
def on_message(client, _userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        payload = msg.payload.decode()

    if topic == "catfeeder/cmd/feed":
        grams = payload.get("portionGrams", 40)
        print(f"⚡ Commande reçue : distribuer {grams}g")
        # Simuler la réponse de l'ESP32
        client.publish("catfeeder/feed", json.dumps({"portionGrams": grams}))
        print(f"🍽  Repas distribué : {grams}g")
    elif topic == "catfeeder/cmd/fill":
        print("✅ Commande reçue : remplissage confirmé")
        client.publish("catfeeder/reservoir", json.dumps({
            "levelPercent": 100,
            "isEmpty": False,
        }))
        print("📦 Réservoir rempli à 100%")

client = mqtt.Client(client_id="esp32-simulator")
client.on_message = on_message
client.connect(BROKER, PORT)
client.subscribe("catfeeder/cmd/feed")
client.subscribe("catfeeder/cmd/fill")
client.loop_start()

print(f"🤖 Simulateur ESP32 démarré (broker={BROKER}:{PORT}) — Ctrl+C pour arrêter\n")

# Annoncer l'ESP en ligne
client.publish("catfeeder/status", json.dumps({"online": True}), retain=True)
print("🟢 ESP32 en ligne")

# Niveau initial du réservoir
level = 75
client.publish("catfeeder/reservoir", json.dumps({
    "levelPercent": level,
    "isEmpty": False,
}))
print(f"📦 Réservoir initial : {level}%\n")

try:
    while True:
        # Simuler un repas toutes les 15 secondes
        portion = random.choice([30, 35, 40, 45])
        client.publish("catfeeder/feed", json.dumps({
            "portionGrams": portion,
        }))
        print(f"🍽  Repas distribué : {portion}g")

        # Mettre à jour le niveau du réservoir
        level = max(0, level - random.randint(3, 8))
        client.publish("catfeeder/reservoir", json.dumps({
            "levelPercent": level,
            "isEmpty":      level == 0,
        }))
        print(f"📦 Réservoir : {level}%")

        time.sleep(15)

except KeyboardInterrupt:
    client.publish("catfeeder/status", json.dumps({"online": False}), retain=True)
    print("\n🔴 ESP32 hors ligne")
    client.loop_stop()
    client.disconnect()

