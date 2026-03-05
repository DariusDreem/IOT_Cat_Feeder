#!/usr/bin/env python3
"""
test_bridge.py — Simule un ESP8266 pour tester le bridge sans matériel.
Lance ce script sur le Raspberry Pi pendant que bridge.py tourne.

Usage :
    python3 test_bridge.py
"""

import json
import time
import random
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT   = 1883

client = mqtt.Client(client_id="esp8266-simulator")
client.connect(BROKER, PORT)
client.loop_start()

print("🤖 Simulateur ESP8266 démarré — Ctrl+C pour arrêter\n")

# Annoncer l'ESP en ligne
client.publish("catfeeder/status", json.dumps({"online": True}))
print("🟢 ESP8266 en ligne")

# Niveau initial du réservoir
level = 75

try:
    while True:
        # Simuler un repas toutes les 10 secondes
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

        time.sleep(10)

except KeyboardInterrupt:
    client.publish("catfeeder/status", json.dumps({"online": False}))
    print("\n🔴 ESP8266 hors ligne")
    client.loop_stop()
    client.disconnect()

