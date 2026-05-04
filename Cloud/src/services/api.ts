import type { CatFeederState } from '../types'

/** Adresse de base de l'ESP8266 — à adapter à votre réseau */
const BASE_URL = import.meta.env.VITE_ESP_URL ?? '/api'

// ---------------------------------------------------------------------------
// Mock data (utilisées quand USE_MOCK=true ou en dehors du réseau local)
// ---------------------------------------------------------------------------
const MOCK_DATA: CatFeederState = {
  isOnline: true,
  reservoir: {
    levelPercent: 15,
    isEmpty: false,
    lastUpdated: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  bowl: {
    weightGrams: 40,
    isEmpty: false,
    lastUpdated: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  feedHistory: [
    { id: '1', timestamp: new Date(Date.now() - 30 * 60_000).toISOString(), portionGrams: 40 },
    { id: '2', timestamp: new Date(Date.now() - 6 * 3600_000).toISOString(), portionGrams: 40 },
    { id: '3', timestamp: new Date(Date.now() - 12 * 3600_000).toISOString(), portionGrams: 40 },
    { id: '4', timestamp: new Date(Date.now() - 18 * 3600_000).toISOString(), portionGrams: 35 },
    { id: '5', timestamp: new Date(Date.now() - 24 * 3600_000).toISOString(), portionGrams: 40 },
  ],
  fillHistory: [
    { id: '1', timestamp: new Date(Date.now() - 2 * 86400_000).toISOString(), filledByUser: 'François' },
    { id: '2', timestamp: new Date(Date.now() - 5 * 86400_000).toISOString(), filledByUser: 'François' },
  ],
}

/** Passer à true pour utiliser les mock data sans ESP8266 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ---------------------------------------------------------------------------
// Fonctions d'API réelles
// ---------------------------------------------------------------------------
async function fetchFromESP<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/** Récupère l'état complet du distributeur */
export async function fetchCatFeederState(): Promise<CatFeederState> {
  if (USE_MOCK) {
    // Simuler un léger délai réseau
    await new Promise(r => setTimeout(r, 400))
    return MOCK_DATA
  }
  return fetchFromESP<CatFeederState>('/state')
}

/** Déclenche manuellement une distribution */
export async function triggerFeed(portionGrams = 40): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300))
    const now = new Date().toISOString()
    MOCK_DATA.feedHistory.unshift({ id: Date.now().toString(), timestamp: now, portionGrams })
    MOCK_DATA.reservoir.levelPercent = Math.max(0, MOCK_DATA.reservoir.levelPercent - 5)
    MOCK_DATA.reservoir.isEmpty = MOCK_DATA.reservoir.levelPercent === 0
    return
  }
  await fetch(`${BASE_URL}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portionGrams }),
  })
}

/** Signale que le réservoir a été rempli */
export async function confirmFill(filledByUser = 'Utilisateur'): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300))
    const now = new Date().toISOString()
    MOCK_DATA.fillHistory.unshift({ id: Date.now().toString(), timestamp: now, filledByUser })
    MOCK_DATA.reservoir.levelPercent = 100
    MOCK_DATA.reservoir.isEmpty = false
    MOCK_DATA.reservoir.lastUpdated = now
    return
  }
  await fetch(`${BASE_URL}/fill`, { method: 'POST' })
}

