#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "HX711.h"
#include "ir_module.h"

// =============================================================
// Configuration —  À ADAPTER pour votre installation
// =============================================================
// ⚠️ IMPORTANT : remplacez ces valeurs avant de flasher l'ESP32 ⚠️
const char *WIFI_SSID = "isildur";       // ← Nom du réseau WiFi
const char *WIFI_PASSWORD = "isildure";  // ← Mot de passe WiFi
const char *MQTT_SERVER = "172.20.10.3"; // ← IP de la Raspberry Pi (broker Mosquitto)
const int MQTT_PORT = 1883;

// =============================================================
// Topics MQTT (doivent correspondre au bridge.py)
// =============================================================
// Publication ESP32 -> Raspberry Pi
const char *TOPIC_FEED = "catfeeder/feed";           // repas distribué
const char *TOPIC_RESERVOIR = "catfeeder/reservoir"; // niveau réservoir
const char *TOPIC_STATUS = "catfeeder/status";       // état en ligne / hors ligne
const char *TOPIC_BOWL = "catfeeder/bowl";           // poids gamelle
const char *TOPIC_ALERT = "catfeeder/alert";         // alerte blocage turbine

// Souscription Raspberry Pi -> ESP32
const char *TOPIC_CMD_FEED = "catfeeder/cmd/feed"; // commande : distribuer
const char *TOPIC_CMD_FILL = "catfeeder/cmd/fill"; // commande : remplissage confirmé

// =============================================================
// Broches matérielles
// =============================================================
const int IR_RESERVOIR_PIN = 16; // IR 1: Niveau réservoir (HIGH = vide)
const int IR_TURBINE_PIN = 17;   // IR 2: Blocage de turbine
const int MOTOR_PIN = 18;        // Moteur DC turbine (via relais/MOSFET)

// Balance (HX711)
const int LOADCELL_DOUT_PIN = 19;
const int LOADCELL_SCK_PIN = 21;
float hx711_calibration_factor = 420.0; // À AJUSTER selon votre cellule de charge

// =============================================================
// Constantes
// =============================================================
const unsigned long SENSOR_INTERVAL = 5000;    // lecture capteurs toutes les 5 s
const unsigned long RECONNECT_INTERVAL = 5000; // tentative reconnexion MQTT toutes les 5 s
const int DEFAULT_PORTION = 40;                // portion par défaut en grammes
const unsigned long MOTOR_TIMEOUT_MS = 15000;  // sécurité: coupe moteur après 15s max

// =============================================================
// Objets globaux
// =============================================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
HX711 scale;
IRModule irModule(IR_RESERVOIR_PIN, IR_TURBINE_PIN, HIGH, HIGH);

unsigned long lastSensorRead = 0;
unsigned long lastReconnect = 0;
bool lastIsEmpty = true;
int lastBowlWeight = -1;

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
// Mesures Capteurs
// =============================================================
bool isReserveEmpty()
{
  return digitalRead(IR_RESERVOIR_PIN) == HIGH;
}

bool detectJam()
{
  // Si le capteur est LOW ou HIGH en cas de problème, adapter ici
  // Par exemple, on peut imaginer un comptage d'impulsions (encodeur optique)
  // Simplification : si on lit une valeur fixe d'alerte sur IR_TURBINE_PIN bloqué
  return irModule.isTurbineBlocked();
}

int getBowlWeight()
{
  if (scale.is_ready())
  {
    float w = scale.get_units(5);
    return w < 0 ? 0 : (int)w;
  }
  return lastBowlWeight;
}

// =============================================================
// Publications MQTT
// =============================================================
void publishReservoir(bool isEmpty)
{
  StaticJsonDocument<128> doc;
  doc["isEmpty"] = isEmpty;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_RESERVOIR, buffer);

  Serial.printf("📡 Reservoir publié : (vide=%s)\n", isEmpty ? "oui" : "non");
}

void publishBowlWeight(int weightGrams, bool isEmpty)
{
  StaticJsonDocument<128> doc;
  doc["weightGrams"] = weightGrams;
  doc["isEmpty"] = isEmpty;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_BOWL, buffer);
  Serial.printf("🍽 Gamelle: %hg (vide=%s)\n", weightGrams, isEmpty ? "oui" : "non");
}

void publishAlert(const char *message)
{
  StaticJsonDocument<128> doc;
  doc["message"] = message;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ALERT, buffer);
  Serial.printf("⚠️ Alerte: %s\n", message);
}

void publishFeedEvent(int portionGrams)
{
  StaticJsonDocument<64> doc;
  doc["portionGrams"] = portionGrams;

  char buffer[64];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_FEED, buffer);

  Serial.printf("🔄 Repas publié : %dg\n", portionGrams);
}

void publishStatus(bool online)
{
  StaticJsonDocument<64> doc;
  doc["online"] = online;

  char buffer[64];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer, true); // retained
}

// =============================================================
// Action de distribution
// =============================================================
void dispenseFeed(int targetPortionGrams)
{
  Serial.printf("⏳ Démarrage distribution pour %dg...\n", targetPortionGrams);

  // Par défaut en développement pour tester facilement sans le vrai matériel, on simule :
  int distributedGrams = targetPortionGrams;
  bool jammed = false;

  // -- TODO: Dé-commenter ou adapter la logique de boucle avec la vraie balance --
  /*
  int startWeight = getBowlWeight();
  int targetWeight = startWeight + targetPortionGrams;

  // Allume le moteur
  digitalWrite(MOTOR_PIN, HIGH);

  unsigned long startTime = millis();

  while (millis() - startTime < MOTOR_TIMEOUT_MS)
  {
    // Vérifier si le poids cible est atteint
    int currentWeight = getBowlWeight();
    if (currentWeight >= targetWeight)
    {
      Serial.println("✅ Portion atteinte !");
      break;
    }

    // Vérifier blocage (Capteur IR de sécurité turbine)
    if (digitalRead(IR_TURBINE_PIN) == HIGH && millis() - startTime > 2000) {
      jammed = true;
      Serial.println("❌ Blocage Turbine détecté !");
      break;
    }

  delay(50);
}

  // Couper moteur
  digitalWrite(MOTOR_PIN, LOW);

  int endWeight = getBowlWeight();
  distributedGrams = max(0, endWeight - startWeight);
  */

  // -- Simulation moteur simple (temporaire pour test) --
  digitalWrite(MOTOR_PIN, HIGH);
  delay(2000); // Fait tourner le moteur 2 secondes
  digitalWrite(MOTOR_PIN, LOW);
  // -----------------------------------------------------

  if (jammed)
  {
    publishAlert("Moteur bloqué !");
  }

  // On envoie le message MQTT de confirmation de distribution (très important pour que le Raspberry enregistre le repas)
  publishFeedEvent(distributedGrams);

  // Mettre à jour l'état final
  int endWeight = getBowlWeight();
  publishBowlWeight(endWeight, endWeight < 5);

  bool emptyRes = isReserveEmpty();
  if (emptyRes != lastIsEmpty)
  {
    publishReservoir(emptyRes);
    lastIsEmpty = emptyRes;
  }
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
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, message);
    int target = DEFAULT_PORTION;
    if (!err && doc["portionGrams"].is<int>())
    {
      target = doc["portionGrams"].as<int>();
    }
    dispenseFeed(target);
  }
  // ——— Commande : remplissage confirmé ———
  else if (strcmp(topic, TOPIC_CMD_FILL) == 0)
  {
    Serial.println("✅ Remplissage confirmé par l'utilisateur");
    // Mettre à jour le niveau à 100 %
    lastIsEmpty = false;
    // publishReservoir(100, false); => Ce n'est plus nécessaire ici car le Pi s'en occupe
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
  StaticJsonDocument<64> lwt;
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
    publishReservoir(isEmpty);
    lastIsEmpty = isEmpty;

    // Publier poids gamelle
    int w = getBowlWeight();
    publishBowlWeight(w, w < 5);
    lastBowlWeight = w;
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
  Serial.println("\n🐾 Cat Feeder ESP32 — Démarrage");

  // Capteurs
  irModule.begin();
  Serial.printf("✅ Module IR initialisé (GPIO Réservoir: %d)\n", IR_RESERVOIR_PIN);
  delay(500); // Attendre la stabilisation du capteur
  bool initialState = irModule.isReservoirEmpty();
  Serial.printf("📊 État initial du réservoir: %s\n", initialState ? "VIDE" : "PLEIN");

  // Actionneurs
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW);

  // Balance
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(hx711_calibration_factor);
  scale.tare(); // NB: Enlève le poids de la gamelle vide au démarrage

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
  irModule.update();

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

  // Lecture périodique des capteurs
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL)
  {
    lastSensorRead = now;

    // 1) Capteur IR Réservoir
    bool isEmpty = isReserveEmpty();
    Serial.printf("📡 IR Réservoir: %s\n", isEmpty ? "VIDE ⚠️" : "PLEIN ✅");
    if (isEmpty != lastIsEmpty)
    {
      publishReservoir(isEmpty);
      lastIsEmpty = isEmpty;
    }

    // 2) Poids gamelle (simulation sans balance)
    // On garde le code de la gamelle mais on le laisse en "simulation"
    // puisqu'on a pas de vraie balance.
    int w = getBowlWeight();
    if (abs(w - lastBowlWeight) > 5) // Seuil de tolérance bruit de 5 grammes
    {
      publishBowlWeight(w, w < 5);
      lastBowlWeight = w;
    }
  }
}
