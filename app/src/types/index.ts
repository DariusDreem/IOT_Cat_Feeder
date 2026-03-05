/** Événement de repas servi */
export interface FeedEvent {
  id: string
  timestamp: string       // ISO 8601
  portionGrams: number    // grammes distribués
}

/** Événement de remplissage du réservoir */
export interface FillEvent {
  id: string
  timestamp: string       // ISO 8601
  filledByUser: string
}

/** État courant du réservoir */
export interface ReservoirStatus {
  levelPercent: number    // 0-100
  isEmpty: boolean
  lastUpdated: string     // ISO 8601
}

/** État global du distributeur */
export interface CatFeederState {
  reservoir: ReservoirStatus
  feedHistory: FeedEvent[]
  fillHistory: FillEvent[]
  isOnline: boolean
}

// ---------------------------------------------------------------------------
// Messages WebSocket (Raspberry Pi → App)
// Chaque message correspond à un topic MQTT republié par le Raspberry Pi
// ---------------------------------------------------------------------------

export type WsMessageType =
  | 'state'           // état complet initial
  | 'feed_event'      // repas vient d'être servi
  | 'reservoir'       // niveau du réservoir mis à jour
  | 'fill_event'      // réservoir vient d'être rempli
  | 'ping'            // keep-alive

export interface WsMessage<T = unknown> {
  type: WsMessageType
  payload: T
}

// Topics MQTT publiés par l'ESP32
// catfeeder/feed       → { portionGrams: number, timestamp: string }
// catfeeder/reservoir  → { levelPercent: number, isEmpty: boolean }
// Topics souscrits par l'ESP32
// catfeeder/cmd/feed   → { portionGrams: number }
// catfeeder/cmd/fill   → {}
