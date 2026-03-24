/**
 * websocket.ts
 * Connexion WebSocket vers le Raspberry Pi.
 * Le Raspberry Pi fait le pont MQTT (ESP8266) ↔ WebSocket (App).
 *
 * En mode mock, un serveur WebSocket simulé tourne localement dans le browser.
 */
import type { CatFeederState, FeedEvent, FillEvent, WsMessage, WsMessageType } from '../types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const RASPBERRY_WS_URL = import.meta.env.VITE_RASPBERRY_WS_URL ?? `ws://${window.location.hostname}:8765`

// ---------------------------------------------------------------------------
// Mock data — format identique à ce que renvoie bridge.py depuis SQLite
// IDs = timestamp ms (comme new_id() Python), timestamps ISO UTC avec Z
// ---------------------------------------------------------------------------
const _t = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
const _id = (msAgo: number) => String(Date.now() - msAgo)

export const MOCK_STATE: CatFeederState = {
  isOnline: true,
  reservoir: {
    levelPercent: 15,
    isEmpty: false,
    lastUpdated: _t(5 * 60_000),
  },
  feedHistory: [
    { id: _id(30 * 60_000),       timestamp: _t(30 * 60_000),       portionGrams: 40 },
    { id: _id(6 * 3600_000),      timestamp: _t(6 * 3600_000),      portionGrams: 40 },
    { id: _id(12 * 3600_000),     timestamp: _t(12 * 3600_000),     portionGrams: 35 },
    { id: _id(18 * 3600_000),     timestamp: _t(18 * 3600_000),     portionGrams: 40 },
    { id: _id(24 * 3600_000),     timestamp: _t(24 * 3600_000),     portionGrams: 40 },
    { id: _id(30 * 3600_000),     timestamp: _t(30 * 3600_000),     portionGrams: 45 },
    { id: _id(36 * 3600_000),     timestamp: _t(36 * 3600_000),     portionGrams: 40 },
  ],
  fillHistory: [
    { id: _id(2 * 86400_000),     timestamp: _t(2 * 86400_000),     filledByUser: 'François' },
    { id: _id(5 * 86400_000),     timestamp: _t(5 * 86400_000),     filledByUser: 'François' },
    { id: _id(9 * 86400_000),     timestamp: _t(9 * 86400_000),     filledByUser: 'Marie' },
  ],
}

// ---------------------------------------------------------------------------
// Types des callbacks
// ---------------------------------------------------------------------------
type MessageHandler = (msg: WsMessage) => void
type StatusHandler = (connected: boolean) => void

// ---------------------------------------------------------------------------
// Classe principale
// ---------------------------------------------------------------------------
export class CatFeederWsClient {
  private ws: WebSocket | null = null
  private messageHandlers = new Set<MessageHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private mockTimer: ReturnType<typeof setInterval> | null = null
  private isMock: boolean

  constructor() {
    this.isMock = USE_MOCK
  }

  connect() {
    if (this.isMock) {
      this._startMock()
      return
    }
    this._connectReal()
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.mockTimer) clearInterval(this.mockTimer)
    this.ws?.close()
    this.ws = null
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  /** Envoie une commande vers le Raspberry Pi (qui publie sur MQTT catfeeder/cmd/...) */
  send(type: WsMessageType, payload: unknown = {}) {
    // ---- LOG ACTION UTILISATEUR ----
    console.info(`[ACTION UTILISATEUR / WS SEND] type=${type}`, payload)
    
    if (this.isMock) {
      this._handleMockCommand(type, payload)
      return
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  // -------------------------------------------------------------------------
  // Connexion réelle (Raspberry Pi)
  // -------------------------------------------------------------------------
  private _connectReal() {
    try {
      this.ws = new WebSocket(RASPBERRY_WS_URL)

      this.ws.onopen = () => {
        this._notifyStatus(true)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage
          // ---- LOG RETOUR SERVEUR ----
          console.debug(`[RETOUR SERVEUR / WS RECV] type=${msg.type}`, msg.payload)
          
          this._notifyMessage(msg)
        } catch {
          console.warn('[WS] Message non JSON reçu', event.data)
        }
      }

      this.ws.onclose = () => {
        this._notifyStatus(false)
        // Reconnexion automatique toutes les 5 secondes
        this.reconnectTimer = setTimeout(() => this._connectReal(), 5000)
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch (err) {
      console.error('[WS] Erreur de connexion', err)
      this.reconnectTimer = setTimeout(() => this._connectReal(), 5000)
    }
  }

  // -------------------------------------------------------------------------
  // Mode mock — simule les messages MQTT sans Raspberry Pi ni ESP8266
  // -------------------------------------------------------------------------
  private _startMock() {
    this._notifyStatus(true)

    // Envoyer l'état initial après un court délai (simule la connexion)
    setTimeout(() => {
      this._notifyMessage({ type: 'state', payload: MOCK_STATE })
    }, 500)

    // Simuler un repas automatique toutes les 2 minutes (pour démonstration)
    this.mockTimer = setInterval(() => {
      const event: FeedEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        portionGrams: 40,
      }
      MOCK_STATE.feedHistory.unshift(event)
      MOCK_STATE.reservoir.levelPercent = Math.max(0, MOCK_STATE.reservoir.levelPercent - 3)
      MOCK_STATE.reservoir.isEmpty = MOCK_STATE.reservoir.levelPercent === 0
      MOCK_STATE.reservoir.lastUpdated = new Date().toISOString()

      this._notifyMessage({ type: 'feed_event', payload: event })
      this._notifyMessage({ type: 'reservoir', payload: MOCK_STATE.reservoir })
    }, 120_000)
  }

  private _handleMockCommand(type: WsMessageType, payload: unknown) {
    setTimeout(() => {
      if (type === 'feed_event') {
        const p = payload as { portionGrams?: number }
        const event: FeedEvent = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          portionGrams: p.portionGrams ?? 40,
        }
        // Mettre à jour uniquement le réservoir dans MOCK_STATE (pas feedHistory — le reducer s'en charge)
        MOCK_STATE.reservoir.levelPercent = Math.max(0, MOCK_STATE.reservoir.levelPercent - 5)
        MOCK_STATE.reservoir.isEmpty = MOCK_STATE.reservoir.levelPercent === 0
        MOCK_STATE.reservoir.lastUpdated = new Date().toISOString()
        this._notifyMessage({ type: 'feed_event', payload: event })
        this._notifyMessage({ type: 'reservoir', payload: { ...MOCK_STATE.reservoir } })
      } else if (type === 'fill_event') {
        const p = payload as { filledByUser?: string }
        const event: FillEvent = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          filledByUser: p.filledByUser ?? 'Utilisateur',
        }
        // Mettre à jour uniquement le réservoir dans MOCK_STATE (pas fillHistory — le reducer s'en charge)
        MOCK_STATE.reservoir.levelPercent = 100
        MOCK_STATE.reservoir.isEmpty = false
        MOCK_STATE.reservoir.lastUpdated = new Date().toISOString()
        this._notifyMessage({ type: 'fill_event', payload: event })
        this._notifyMessage({ type: 'reservoir', payload: { ...MOCK_STATE.reservoir } })
      }
    }, 300)
  }

  private _notifyMessage(msg: WsMessage) {
    this.messageHandlers.forEach(h => h(msg))
  }

  private _notifyStatus(connected: boolean) {
    this.statusHandlers.forEach(h => h(connected))
  }
}

/** Instance singleton */
export const wsClient = new CatFeederWsClient()
