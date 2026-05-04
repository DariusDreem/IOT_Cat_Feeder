# 🐱 Distributeur de Croquettes Connecté – README

## 📌 Description du projet

Ce projet est un **système IoT complet** pour distributeur de croquettes connecté, avec supervision temps réel et historique persistant. Le système combine un **microcontrôleur embarqué (ESP32)**, une **passerelle Edge (Raspberry Pi 5)** et une **infrastructure Cloud optionnelle** pour assurer une disponibilité maximale même en cas de perte réseau.

### Fonctionnalités Principales

✅ **Distribution motorisée** des croquettes avec mesure de portion  
✅ **Détection du niveau du réservoir** via capteur IR laser  
✅ **Pesage de la gamelle** avec balance HX711  
✅ **Détection présence du chat** via capteur ultrason (optionnel)  
✅ **Supervision temps réel** via WebSocket sur mobile/web  
✅ **Historique persistant** localement (SQLite) et dans le Cloud (PostgreSQL)  
✅ **Synchronisation Edge-to-Cloud** avec récupération en cas de déconnexion  
✅ **Interface utilisateur réactive** (React 19 + TypeScript + Tailwind CSS)  
✅ **Gestion d'alertes** (moteur bloqué, réservoir vide, etc.)  
✅ **Mode hors-ligne** : l'app continue de fonctionner si Cloud indisponible

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
                │  - SQLite (Docker)   │
                └──────────┬───────────┘
                           │ MQTT / Wi-Fi
                           │
        ┌──────────────────▼──────────────────┐
        │               ESP32                 │
        │                                     │
        │  ┌──────────────┐                   │
        │  │ Capteur      │                   │
        │  │ Ultrason     │── Détection chat  │
        │  └──────────────┘                   │
        │                                     │
        │  ┌──────────────┐                   │
        │  │ Laser +      │                   │
        │  │ Récepteur    │── Niveau stock    │
        │  └──────────────┘                   │
        │                                     │
        │  ┌──────────────┐                   │
        │  │ Servomoteur  │                   │
        │  │ + Moteur     │── Distribution    │
        │  └──────────────┘                   │
        │                                     │
        │  Boutons réglages                   │
        └────────────────────────────────────┘
```
<img width="1101" height="549" alt="image" src="https://github.com/user-attachments/assets/018c4510-7a39-4b35-aacf-1782afb3680a" />

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
