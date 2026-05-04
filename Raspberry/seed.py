#!/usr/bin/env python3
"""
seed.py — Remplit la base SQLite avec des données de test réalistes.
Lance ce script UNE FOIS avant de démarrer bridge.py.

Usage :
    python3 seed.py
    python3 seed.py --reset   # efface tout avant de seeder
"""

import argparse
import random
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "catfeeder.db"

# ---------------------------------------------------------------------------
# Config du seed
# ---------------------------------------------------------------------------
DAYS_BACK       = 14        # 2 semaines d'historique
MEALS_PER_DAY   = (2, 4)    # entre 2 et 4 repas par jour
FILL_EVERY_DAYS = 4         # un remplissage tous les ~4 jours
PORTION_CHOICES = [30, 35, 40, 40, 40, 45]   # pondéré vers 40g
USERS           = ["François", "François", "François", "Marie"]  # pondéré

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def ts(dt: datetime) -> str:
    # Toujours en Z (pas +00:00) pour compatibilité avec JS new Date()
    return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f"{dt.microsecond // 1000:03d}Z"

def new_id(dt: datetime) -> str:
    return str(int(dt.timestamp() * 1000))

# ---------------------------------------------------------------------------
# Init / reset
# ---------------------------------------------------------------------------
def init_db(con: sqlite3.Connection):
    con.executescript("""
        CREATE TABLE IF NOT EXISTS feed_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            portionGrams INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fill_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            filledByUser TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reservoir (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            levelPercent INTEGER NOT NULL DEFAULT 0,
            isEmpty INTEGER NOT NULL DEFAULT 1,
            lastUpdated TEXT NOT NULL
        );
    """)
    con.execute("""
        INSERT OR IGNORE INTO reservoir (id, levelPercent, isEmpty, lastUpdated)
        VALUES (1, 0, 1, ?)
    """, (ts(now_utc()),))
    con.commit()

def reset_db(con: sqlite3.Connection):
    con.executescript("""
        DELETE FROM feed_events;
        DELETE FROM fill_events;
        DELETE FROM reservoir;
    """)
    con.commit()
    print("🗑  Base vidée")

# ---------------------------------------------------------------------------
# Génération des données
# ---------------------------------------------------------------------------
def seed(con: sqlite3.Connection):
    feed_events = []
    fill_events = []

    base = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)

    # Heures typiques de repas selon le nombre de repas par jour
    meal_schedules = {
        2: [(8, 0),  (18, 0)],
        3: [(8, 0),  (13, 0), (19, 0)],
        4: [(8, 0),  (12, 0), (16, 0), (20, 0)],
    }

    level = 100   # commence plein

    for day_offset in range(DAYS_BACK, -1, -1):
        day = base - timedelta(days=day_offset)

        # ── Remplissage ce jour-là ? ──────────────────────────────────────
        if day_offset % FILL_EVERY_DAYS == 0 or level < 15:
            fill_time = day.replace(hour=random.randint(8, 10),
                                    minute=random.randint(0, 59))
            # Ne pas remplir dans le futur
            if fill_time <= now_utc():
                fill_events.append({
                    "id":           new_id(fill_time),
                    "timestamp":    ts(fill_time),
                    "filledByUser": random.choice(USERS),
                })
                level = 100
                print(f"💧 Remplissage le {fill_time.strftime('%d/%m %H:%M')} → 100%")

        # ── Repas de la journée ───────────────────────────────────────────
        nb_meals = random.randint(*MEALS_PER_DAY)
        schedule = meal_schedules.get(nb_meals, meal_schedules[2])

        for hour, minute in schedule:
            # Ajouter un peu d'aléatoire sur l'heure
            meal_time = day.replace(
                hour=hour,
                minute=minute + random.randint(-10, 10),
            )
            # Ne pas ajouter des repas dans le futur
            if meal_time > now_utc():
                continue

            portion = random.choice(PORTION_CHOICES)
            feed_events.append({
                "id":           new_id(meal_time),
                "timestamp":    ts(meal_time),
                "portionGrams": portion,
            })
            level = max(0, level - random.randint(3, 7))

    # ── Insérer en base ───────────────────────────────────────────────────
    con.executemany(
        "INSERT OR REPLACE INTO feed_events (id, timestamp, portionGrams) VALUES (:id, :timestamp, :portionGrams)",
        feed_events,
    )
    con.executemany(
        "INSERT OR REPLACE INTO fill_events (id, timestamp, filledByUser) VALUES (:id, :timestamp, :filledByUser)",
        fill_events,
    )

    # Réservoir : état actuel simulé
    reservoir_level = max(5, level)
    con.execute(
        "INSERT OR REPLACE INTO reservoir (id, levelPercent, isEmpty, lastUpdated) VALUES (1, ?, ?, ?)",
        (reservoir_level, int(reservoir_level == 0), ts(now_utc())),
    )
    con.commit()

    print(f"\n✅ Seed terminé !")
    print(f"   🍽  {len(feed_events)} repas insérés ({DAYS_BACK} jours)")
    print(f"   💧 {len(fill_events)} remplissages insérés")
    print(f"   📦 Réservoir actuel : {reservoir_level}%")
    print(f"   📁 Base : {DB_PATH}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed la base SQLite Cat Feeder")
    parser.add_argument("--reset", action="store_true", help="Efface tout avant de seeder")
    args = parser.parse_args()

    con = sqlite3.connect(DB_PATH)

    init_db(con)

    if args.reset:
        reset_db(con)

    seed(con)
    con.close()

    print("\n🚀 Vous pouvez maintenant lancer : python3 bridge.py")


