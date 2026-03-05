#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =============================================================
// Configuration — adapter à votre réseau / Raspberry Pi
// =============================================================
const char *WIFI_SSID = "VOTRE_SSID";             // ← Nom du réseau WiFi
const char *WIFI_PASSWORD = "VOTRE_MOT_DE_PASSE"; // ← Mot de passe WiFi
const char *MQTT_SERVER = "192.168.1.XX";         // ← IP du Raspberry Pi
const int MQTT_PORT = 1883;

// =============================================================
// Topics MQTT (doivent correspondre au bridge.py)
// =============================================================
// Publication ESP32 → Raspberry Pi
const char *TOPIC_FEED = "catfeeder/feed";           // repas distribué
const char *TOPIC_RESERVOIR = "catfeeder/reservoir"; // niveau réservoir
const char *TOPIC_STATUS = "catfeeder/status";       // état en ligne / hors ligne

// Souscription Raspberry Pi → ESP32
const char *TOPIC_CMD_FEED = "catfeeder/cmd/feed"; // commande : distribuer
const char *TOPIC_CMD_FILL = "catfeeder/cmd/fill"; // commande : remplissage confirmé

// =============================================================
// Broches matérielles
// =============================================================
const int SENSOR_PIN = 16; // capteur de niveau (HIGH = réservoir vide)
const int SERVO_PIN = 17;  // servo-moteur de distribution (PWM)

// =============================================================
// Constantes
// =============================================================
const unsigned long SENSOR_INTERVAL = 10000;   // lecture capteur toutes les 10 s
const unsigned long RECONNECT_INTERVAL = 5000; // tentative reconnexion MQTT toutes les 5 s
const int DEFAULT_PORTION = 40;                // portion par défaut en grammes
const unsigned long FEED_DURATION_MS = 2000;   // durée d'ouverture du servo (ms)

// =============================================================
// Objets globaux
// =============================================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastSensorRead = 0;
unsigned long lastReconnect = 0;
bool lastIsEmpty = true;
int lastLevelPercent = 0;

// =============================================================
// Fonctions WiFi
// =============================================================
void setupWiFi()
{
  Serial.print("📶 Connexion WiFi à ");
  Serial.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println();
    Serial.print("✅ WiFi connecté — IP : ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println();
    Serial.println("❌ Échec connexion WiFi — redémarrage dans 5 s…");
    delay(5000);
    ESP.restart();
  }
}

// =============================================================
// Mesure du réservoir
// =============================================================
bool isReserveEmpty()
{
  return digitalRead(SENSOR_PIN) == HIGH;
}

int estimateLevelPercent(bool isEmpty)
{
  // Avec un capteur binaire on ne peut que donner 0% ou 100%.
  // Si vous ajoutez un capteur analogique (ex. HC-SR04), adaptez ici.
  return isEmpty ? 0 : 100;
}

// =============================================================
// Publication MQTT — niveau réservoir
// =============================================================
void publishReservoir(int levelPercent, bool isEmpty)
{
  JsonDocument doc;
  doc["levelPercent"] = levelPercent;
  doc["isEmpty"] = isEmpty;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_RESERVOIR, buffer);

  Serial.printf("📦 Reservoir publié : %d%% (vide=%s)\n", levelPercent, isEmpty ? "oui" : "non");
}

// =============================================================
// Publication MQTT — repas distribué
// =============================================================
void publishFeedEvent(int portionGrams)
{
  JsonDocument doc;
  doc["portionGrams"] = portionGrams;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_FEED, buffer);

  Serial.printf("🍽 Repas publié : %dg\n", portionGrams);
}

// =============================================================
// Publication MQTT — statut en ligne
// =============================================================
void publishStatus(bool online)
{
  JsonDocument doc;
  doc["online"] = online;

  char buffer[64];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer, true); // retained
}

// =============================================================
// Action de distribution
// =============================================================
void dispenseFeed(int portionGrams)
{
  Serial.printf("⚡ Distribution de %dg…\n", portionGrams);

  // Activer le servo-moteur pour ouvrir la trappe
  // Servo standard 50 Hz, 16 bits : 0° ≈ 3277 (1ms), 90° ≈ 4915 (1.5ms), 180° ≈ 6554 (2ms)
  ledcAttach(SERVO_PIN, 50, 16); // PWM 50 Hz, résolution 16 bits
  ledcWrite(SERVO_PIN, 4915);    // ~90° (position ouverte)

  delay(FEED_DURATION_MS);

  ledcWrite(SERVO_PIN, 3277); // ~0° (position fermée, 1ms pulse)
  delay(500);
  ledcDetach(SERVO_PIN);

  // Publier l'événement de repas
  publishFeedEvent(portionGrams);

  // Relire le capteur immédiatement après distribution
  bool isEmpty = isReserveEmpty();
  int level = estimateLevelPercent(isEmpty);
  publishReservoir(level, isEmpty);
  lastIsEmpty = isEmpty;
  lastLevelPercent = level;
}

// =============================================================
// Callback MQTT — messages reçus du broker
// =============================================================
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  // Convertir le payload en String
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.printf("📨 MQTT reçu [%s] : %s\n", topic, message);

  // ── Commande : distribuer ──
  if (strcmp(topic, TOPIC_CMD_FEED) == 0)
  {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, message);
    int grams = DEFAULT_PORTION;
    if (!err && doc["portionGrams"].is<int>())
    {
      grams = doc["portionGrams"].as<int>();
    }
    dispenseFeed(grams);
  }
  // ── Commande : remplissage confirmé ──
  else if (strcmp(topic, TOPIC_CMD_FILL) == 0)
  {
    Serial.println("✅ Remplissage confirmé par l'utilisateur");
    // Mettre à jour le niveau à 100 %
    lastIsEmpty = false;
    lastLevelPercent = 100;
    publishReservoir(100, false);
  }
}

// =============================================================
// Connexion / reconnexion MQTT
// =============================================================
void connectMQTT()
{
  if (mqttClient.connected())
    return;

  unsigned long now = millis();
  if (now - lastReconnect < RECONNECT_INTERVAL)
    return;
  lastReconnect = now;

  Serial.print("🔌 Connexion MQTT à ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.println("…");

  // Last Will & Testament : si l'ESP32 se déconnecte, le broker publie offline
  JsonDocument lwt;
  lwt["online"] = false;
  char lwtBuf[64];
  serializeJson(lwt, lwtBuf);

  if (mqttClient.connect("catfeeder-esp32", TOPIC_STATUS, 0, true, lwtBuf))
  {
    Serial.println("✅ MQTT connecté au broker Raspberry Pi");

    // Souscrire aux commandes venant de l'app
    mqttClient.subscribe(TOPIC_CMD_FEED);
    mqttClient.subscribe(TOPIC_CMD_FILL);
    Serial.println("   📡 Souscrit : catfeeder/cmd/feed, catfeeder/cmd/fill");

    // Publier le statut « en ligne »
    publishStatus(true);

    // Publier l'état actuel du réservoir
    bool isEmpty = isReserveEmpty();
    int level = estimateLevelPercent(isEmpty);
    publishReservoir(level, isEmpty);
    lastIsEmpty = isEmpty;
    lastLevelPercent = level;
  }
  else
  {
    Serial.printf("❌ MQTT échec (rc=%d), nouvelle tentative dans %lu ms\n",
                  mqttClient.state(), RECONNECT_INTERVAL);
  }
}

// =============================================================
// Setup
// =============================================================
void setup()
{
  Serial.begin(115200);
  delay(100);
  Serial.println("\n🐱 Cat Feeder ESP32 — Démarrage");

  // Capteur de niveau
  pinMode(SENSOR_PIN, INPUT);

  // Connexion WiFi
  setupWiFi();

  // Configuration MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
}

// =============================================================
// Loop
// =============================================================
void loop()
{
  // Maintenir la connexion WiFi
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("⚠️ WiFi perdu — reconnexion…");
    setupWiFi();
  }

  // Maintenir la connexion MQTT
  if (!mqttClient.connected())
  {
    connectMQTT();
  }
  mqttClient.loop();

  // Lecture périodique du capteur de niveau
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL)
  {
    lastSensorRead = now;

    bool isEmpty = isReserveEmpty();
    int level = estimateLevelPercent(isEmpty);

    // Ne publier que s'il y a un changement
    if (isEmpty != lastIsEmpty || level != lastLevelPercent)
    {
      publishReservoir(level, isEmpty);
      lastIsEmpty = isEmpty;
      lastLevelPercent = level;
    }
  }
}
