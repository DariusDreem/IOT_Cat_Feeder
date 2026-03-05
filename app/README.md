# Cat Feeder — Application Mobile

Application mobile-first React (Vite + TypeScript + Tailwind CSS) pour le tableau de bord du distributeur IoT.

## Prérequis

- [Node.js](https://nodejs.org/) ≥ 18

## Installation & démarrage

```bash
cd app
npm install
npm run dev
```

L'application s'ouvre sur `http://localhost:5173`.

## Configuration

Créez un fichier `.env.local` dans `app/` :

```env
# Adresse IP de l'ESP8266 sur votre réseau local
VITE_ESP_URL=http://192.168.1.100/api

# Mettre à false pour utiliser l'ESP8266 réel
VITE_USE_MOCK=true
```

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🐱 Dernier repas | Date/heure et portion du dernier repas servi |
| 📋 Historique repas | Liste complète des repas avec horodatage |
| ⚡ Distribution manuelle | Bouton pour déclencher un repas à distance |
| 📦 Niveau réservoir | Jauge visuelle + alerte si vide ou bas |
| ✅ Confirmer remplissage | Bouton pour signaler qu'on a rempli |
| 💧 Historique remplissages | Qui a rempli et quand |
| 🔄 Polling automatique | Rafraîchissement toutes les 30 secondes |
| 📶 État connexion | Indicateur en ligne / hors ligne |

## Architecture

```
src/
├── types/          # Interfaces TypeScript (FeedEvent, FillEvent, …)
├── services/       # api.ts — fetch vers l'ESP8266 + mock data
├── hooks/          # useCatFeeder.ts — React Query
├── utils/          # formatters.ts — dates
└── components/
    ├── Header.tsx
    ├── AlertBanner.tsx
    ├── ReservoirCard.tsx
    ├── FeedHistoryList.tsx
    └── FillHistoryList.tsx
```

## API ESP8266 attendue

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/state` | État complet (reservoir + historiques) |
| POST | `/api/feed` | Déclencher une distribution |
| POST | `/api/fill` | Confirmer le remplissage |

