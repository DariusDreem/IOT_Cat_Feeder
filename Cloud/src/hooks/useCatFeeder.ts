/**
 * useCatFeeder.ts
 * Gère la connexion WebSocket vers le Raspberry Pi et expose l'état en temps réel.
 * Les données arrivent via MQTT (ESP8266 → Raspberry Pi → WebSocket → App).
 */
import { useEffect, useReducer, useCallback } from 'react'
import { wsClient } from '../services/websocket'
import type {
  CatFeederState,
  FeedEvent,
  FillEvent,
  ReservoirStatus,
  WsMessage,
  BowlStatus,
} from '../types'

// ---------------------------------------------------------------------------
// État + Reducer
// ---------------------------------------------------------------------------
interface State {
  data: CatFeederState | null
  isConnected: boolean
  isLoading: boolean
}

type Action =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'STATE'; payload: CatFeederState }
  | { type: 'FEED_EVENT'; payload: FeedEvent }
  | { type: 'RESERVOIR'; payload: ReservoirStatus }
  | { type: 'FILL_EVENT'; payload: FillEvent }
  | { type: 'BOWL'; payload: BowlStatus }
  | { type: 'ALERT'; payload: { message: string, timestamp: string } }
  | { type: 'SET_HISTORIES'; payload: { feeds: FeedEvent[], fills: FillEvent[] } }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true }
    case 'DISCONNECTED':
      return { ...state, isConnected: false, isLoading: false }
    case 'STATE':
      // On conserve l'historique potentiellement déjà chargé par PostgreSQL
      return { 
        ...state, 
        data: {
          ...action.payload,
          feedHistory: state.data?.feedHistory?.length ? state.data.feedHistory : action.payload.feedHistory,
          fillHistory: state.data?.fillHistory?.length ? state.data.fillHistory : action.payload.fillHistory,
        }, 
        isLoading: false 
      }
    case 'FEED_EVENT':
      if (!state.data) return state
      // Dédupliquer par id (évite les doublons si le bridge envoie state + feed_event)
      if (state.data.feedHistory.some(e => e.id === action.payload.id)) return state
      return {
        ...state,
        data: {
          ...state.data,
          feedHistory: [action.payload, ...state.data.feedHistory],
        },
      }
    case 'RESERVOIR':
      if (!state.data) return state
      return {
        ...state,
        data: {
          ...state.data,
          reservoir: action.payload,
        },
      }
    case 'BOWL':
      if (!state.data) return state
      return {
        ...state,
        data: {
          ...state.data,
          bowl: action.payload,
        },
      }
    case 'FILL_EVENT':
      if (!state.data) return state
      // Dédupliquer par id
      if (state.data.fillHistory.some(e => e.id === action.payload.id)) return state
      return {
        ...state,
        data: {
          ...state.data,
          fillHistory: [action.payload, ...state.data.fillHistory],
        },
      }
    case 'ALERT':
      // Vous pourriez afficher ça dans un toast/snackbar
      console.warn('⚠️ ALERTE ESP32:', action.payload.message)
      return state
    case 'SET_HISTORIES':
      if (!state.data) return state
      return {
        ...state,
        data: {
          ...state.data,
          feedHistory: action.payload.feeds,
          fillHistory: action.payload.fills,
        },
        isLoading: false
      }
    default:
      return state
  }
}

const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL ?? `http://${window.location.hostname}:3000`

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------
export function useCatFeederData() {
  const [state, dispatch] = useReducer(reducer, {
    data: null,
    isConnected: false,
    isLoading: true,
  })

  const connect = useCallback(() => {
    wsClient.connect()
  }, [])

  const disconnect = useCallback(() => {
    wsClient.disconnect()
  }, [])

  useEffect(() => {
    // Abonnement aux statuts de connexion
    const unsubStatus = wsClient.onStatus((connected) => {
      dispatch({ type: connected ? 'CONNECTED' : 'DISCONNECTED' })
    })

    // Abonnement aux messages MQTT relayés par le Raspberry Pi
    const unsubMsg = wsClient.onMessage((msg: WsMessage) => {
      switch (msg.type) {
        case 'state':
          dispatch({ type: 'STATE', payload: msg.payload as CatFeederState })
          break
        case 'feed_event':
          dispatch({ type: 'FEED_EVENT', payload: msg.payload as FeedEvent })
          break
        case 'reservoir':
          dispatch({ type: 'RESERVOIR', payload: msg.payload as ReservoirStatus })
          break
        case 'fill_event':
          dispatch({ type: 'FILL_EVENT', payload: msg.payload as FillEvent })
          break
        case 'bowl':
          dispatch({ type: 'BOWL', payload: msg.payload as BowlStatus })
          break
        case 'alert':
          dispatch({ type: 'ALERT', payload: msg.payload as { message: string, timestamp: string } })
          break
      }
    })

    // Charger l'historique principal (Long-terme) depuis l'API Cloud FastAPI (Postgres)
    const fetchCloudHistory = async () => {
      try {
        const [feedsRes, fillsRes] = await Promise.all([
          fetch(`${CLOUD_API_URL}/api/feeds`),
          fetch(`${CLOUD_API_URL}/api/fills`)
        ])
        
        if (feedsRes.ok && fillsRes.ok) {
          const feeds = await feedsRes.json()
          const fills = await fillsRes.json()
          dispatch({ type: 'SET_HISTORIES', payload: { feeds, fills } })
        }
      } catch (err) {
        console.warn("Impossible de joindre l'API Cloud Postgres, utilisation du cache SQLite.", err)
      }
    }

    // Connexion automatique au montage
    connect()
    fetchCloudHistory()

    return () => {
      unsubStatus()
      unsubMsg()
      disconnect()
    }
  }, [connect, disconnect])

  return {
    data: state.data,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    isError: !state.isConnected && !state.isLoading,
    connect,
    disconnect,
  }
}

// ---------------------------------------------------------------------------
// Actions (commandes vers l'ESP8266 via Raspberry Pi → MQTT)
// ---------------------------------------------------------------------------

/** Déclenche une distribution (publie sur catfeeder/cmd/feed) */
export function useTriggerFeed() {
  const trigger = useCallback((portionGrams = 40) => {
    wsClient.send('feed_event', { portionGrams })
  }, [])
  return { mutate: trigger, isPending: false }
}

/** Confirme le remplissage du réservoir (publie sur catfeeder/cmd/fill) */
export function useConfirmFill() {
  const confirm = useCallback((filledByUser = 'François') => {
    wsClient.send('fill_event', { filledByUser })
  }, [])
  return { mutate: confirm, isPending: false }
}
