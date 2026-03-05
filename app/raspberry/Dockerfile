# ============================================================
# Dockerfile — Cat Feeder Bridge (Python + paho-mqtt + websockets)
# ============================================================
# python:3.11-slim est multi-arch : fonctionne sur Raspberry Pi (ARM64/ARMv7) et x86_64
FROM python:3.11-slim

WORKDIR /app

# Copier les dépendances en premier pour profiter du cache Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier les scripts
COPY bridge.py .
COPY seed.py .

# Dossier pour la base de données (monté en volume)
RUN mkdir -p /data

# Variables d'environnement configurables
ENV MQTT_BROKER=mosquitto \
    MQTT_PORT=1883 \
    WS_HOST=0.0.0.0 \
    WS_PORT=8765 \
    DB_PATH=/data/catfeeder.db \
    PYTHONUNBUFFERED=1

EXPOSE 8765

CMD ["python3", "bridge.py"]


