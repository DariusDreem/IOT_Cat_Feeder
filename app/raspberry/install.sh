#!/bin/bash
# =============================================================================
# install.sh — Installation automatique du Cat Feeder Bridge sur Raspberry Pi
# Usage : chmod +x install.sh && sudo ./install.sh
# =============================================================================
set -e

INSTALL_DIR="/home/pi/cat-feeder"
SERVICE_NAME="catfeeder-bridge"
PYTHON_BIN=$(which python3)

echo ""
echo "🐱 ==============================="
echo "   Cat Feeder — Installation"
echo "=================================="
echo ""

# -----------------------------------------------------------------------------
# 1. Dépendances système
# -----------------------------------------------------------------------------
echo "📦 [1/5] Mise à jour des paquets..."
apt update -qq

echo "📦 [2/5] Installation de Mosquitto + Python..."
apt install -y \
    mosquitto \
    mosquitto-clients \
    python3 \
    python3-pip \
    python3-venv \
    git \
    sqlite3

# Activer et démarrer Mosquitto
systemctl enable mosquitto
systemctl start mosquitto
echo "   ✅ Mosquitto démarré"

# -----------------------------------------------------------------------------
# 2. Dossier d'installation
# -----------------------------------------------------------------------------
echo "📁 [3/5] Copie des fichiers dans $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp bridge.py     "$INSTALL_DIR/"
cp requirements.txt "$INSTALL_DIR/"
cp seed.py       "$INSTALL_DIR/"
cp test_bridge.py "$INSTALL_DIR/"
chown -R pi:pi "$INSTALL_DIR"

# -----------------------------------------------------------------------------
# 3. Environnement Python virtuel + dépendances
# -----------------------------------------------------------------------------
echo "🐍 [4/5] Installation des dépendances Python..."
sudo -u pi python3 -m venv "$INSTALL_DIR/venv"
sudo -u pi "$INSTALL_DIR/venv/bin/pip" install --upgrade pip -q
sudo -u pi "$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt" -q
echo "   ✅ paho-mqtt et websockets installés"

# Seed initial de la base de données
echo "🌱 Initialisation de la base de données avec des données de test..."
sudo -u pi "$INSTALL_DIR/venv/bin/python3" "$INSTALL_DIR/seed.py"
echo "   ✅ Base de données initialisée"

# -----------------------------------------------------------------------------
# 4. Service systemd
# -----------------------------------------------------------------------------
echo "⚙️  [5/5] Configuration du service systemd..."

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Cat Feeder — MQTT/WebSocket Bridge
After=network-online.target mosquitto.service
Wants=network-online.target mosquitto.service

[Service]
Type=simple
User=pi
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/venv/bin/python3 ${INSTALL_DIR}/bridge.py
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start  ${SERVICE_NAME}

sleep 2
STATUS=$(systemctl is-active ${SERVICE_NAME})

echo ""
echo "=================================="
if [ "$STATUS" = "active" ]; then
    echo "✅ Service '$SERVICE_NAME' actif !"
else
    echo "⚠️  Service '$SERVICE_NAME' : $STATUS"
    echo "   Vérifiez avec : journalctl -u $SERVICE_NAME -n 20"
fi

# Afficher l'IP du Raspberry Pi
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "📱 Dans l'app, configurer :"
echo "   VITE_RASPBERRY_WS_URL=ws://${IP}:8765"
echo "   ou"
echo "   VITE_RASPBERRY_WS_URL=ws://raspberrypi.local:8765"
echo ""
echo "🔧 Commandes utiles :"
echo "   sudo systemctl status $SERVICE_NAME"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo "   sudo systemctl restart $SERVICE_NAME"
echo "=================================="



