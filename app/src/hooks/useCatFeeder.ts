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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true }
    case 'DISCONNECTED':
      return { ...state, isConnected: false, isLoading: false }
    case 'STATE':
      return { ...state, data: action.payload, isLoading: false }
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
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------
export function useCatFeederData() {
  const [state, dispatch] = useReducer(reducer, {
    data: null,
    isConnected: false,
    isLoading: true,
  })

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
      }
    })

    wsClient.connect()

    return () => {
      unsubStatus()
      unsubMsg()
      wsClient.disconnect()
    }
  }, [])

  return {
    data: state.data,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    isError: !state.isConnected && !state.isLoading,
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
