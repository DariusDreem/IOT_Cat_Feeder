# 🐱 Distributeur de Croquettes Connecté – README

## 📌 Description du projet

Ce projet consiste à concevoir un **distributeur de croquettes connecté** pour chat, automatisé et supervisé à distance.

Fonctionnalités principales :

* Distribution motorisée des croquettes
* Détection de la présence du chat
* Vérification du niveau du réservoir
* Réglages locaux via boutons
* Supervision et contrôle à distance
* Stockage des données (historique, états, logs)

---

# 🧰 Liste des composants matériels

## 🔧 Électronique embarquée (partie locale)

| Composant                | Rôle                                 |
| ------------------------ | ------------------------------------ |
| ESP32                    | Microcontrôleur principal            |
| Palonnier / Servomoteur  | Actionne l’ouverture du distributeur |
| Moteur (DC ou pas à pas) | Distribution des croquettes          |
| Module Laser + Récepteur | Détection niveau réservoir           |
| Capteur Ultrason         | Détection présence du chat           |
| Boutons de réglage       | Paramétrage manuel                   |
| Écran (optionnel)        | Affichage infos / état               |
| Alimentation secteur     | Source principale                    |
| Piles / Batterie         | Secours / mobilité                   |
| Régulateur de tension    | Protection alimentation              |
| Breadboard / PCB         | Prototypage / intégration            |
| Câblage (Dupont, etc.)   | Connexions                           |

---

## 🌐 Partie distante (serveur / supervision)

| Composant                  | Rôle              |
| -------------------------- | ----------------- |
| ESP secondaire (optionnel) | Relais IoT        |
| Raspberry Pi 5             | Serveur principal |
| Carte microSD / SSD        | Stockage          |
| Réseau Wi-Fi / Ethernet    | Communication     |

---

# 🧠 Architecture logicielle

## Protocoles de communication

* **MQTT** → Télémétrie temps réel
* **HTTP REST** → API & configuration
* **Wi-Fi** → Transport réseau

---

## 🗄️ Base de données

* **SQLite**
* Conteneurisée via **Docker**
* Hébergée sur la partie distante (Raspberry Pi)

### Données stockées

* Historique distributions
* Détections présence chat
* Niveau réservoir
* Logs système
* Paramètres utilisateurs

---

# 📂 Structure du projet

```
distributeur-croquettes/
│
├── firmware/
│   ├── esp32_main/
│   │   ├── src/
│   │   │   ├── main.cpp
│   │   │   ├── wifi.cpp
│   │   │   ├── mqtt.cpp
│   │   │   ├── capteurs.cpp
│   │   │   ├── moteur.cpp
│   │   │   └── laser.cpp
│   │   └── include/
│   │
│   └── esp_remote/ (optionnel)
│
├── server/
│   ├── api_http/
│   │   ├── app.py / app.js
│   │   └── routes/
│   │
│   ├── mqtt_broker/
│   │
│   └── database/
│       ├── schema.sql
│       └── data.db
│
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile
│
├── docs/
│   ├── schema_electrique.png
│   └── architecture.md
│
└── README.md
```

---

# 🔌 Schéma d’architecture global

```
                ┌──────────────────────┐
                │   Interface Web /    │
                │   Application        │
                └──────────┬───────────┘
                           │ HTTP
                           │
                ┌──────────▼───────────┐
                │   Serveur Raspberry  │
                │        Pi 5          │
                │                      │
                │  - API HTTP          │
                │  - Broker MQTT       │
                │  - SQLite (Docker)  │
                └──────────┬───────────┘
                           │ MQTT / Wi-Fi
                           │
        ┌──────────────────▼──────────────────┐
        │               ESP32                 │
        │                                    │
        │  ┌──────────────┐                  │
        │  │ Capteur      │                  │
        │  │ Ultrason     │── Détection chat│
        │  └──────────────┘                  │
        │                                    │
        │  ┌──────────────┐                  │
        │  │ Laser +      │                  │
        │  │ Récepteur    │── Niveau stock  │
        │  └──────────────┘                  │
        │                                    │
        │  ┌──────────────┐                  │
        │  │ Servomoteur  │                  │
        │  │ + Moteur     │── Distribution  │
        │  └──────────────┘                  │
        │                                    │
        │  Boutons réglages                  │
        └────────────────────────────────────┘
```

---

# ⚙️ Logique de fonctionnement

1. Le capteur ultrason détecte la présence du chat.
2. Si présence validée → vérification planning / autorisation.
3. Le moteur + palonnier distribuent la portion.
4. Le laser vérifie le niveau restant.
5. Les données sont envoyées via MQTT.
6. Le serveur stocke en base SQLite.
7. Supervision via API HTTP / interface web.

---

# 🔐 Sécurité & fiabilité (prévu)

* Authentification API
* TLS MQTT (optionnel)
* Watchdog ESP32
* Mode hors-ligne
* Batterie de secours

---

# 🚀 Évolutions possibles

* Caméra embarquée
* Reconnaissance du chat
* Balance pour dosage précis
* Notifications mobile
* Statistiques alimentaires

---

# 👥 Auteurs / Équipe

Nathan Reungoat
François Gourbal

---

# 📜 Licence
