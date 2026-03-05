/**
 * SettingsContext.tsx
 * Contexte global pour les paramètres de l'application.
 * Persisté dans localStorage.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyColorPalette, applyTheme } from '../utils/theme'

export type Theme = 'light' | 'dark' | 'system'
export type AccentColor = 'orange' | 'blue' | 'green' | 'purple'

export interface FeedSchedule {
  id: string
  label: string       // ex. "Matin"
  time: string        // ex. "08:00"
  portionGrams: number
  enabled: boolean
}

export interface Settings {
  theme: Theme
  accentColor: AccentColor
  catName: string
  defaultPortionGrams: number
  schedules: FeedSchedule[]
  raspberryWsUrl: string
  useMock: boolean
  lowReservoirThreshold: number   // % en dessous duquel l'alerte se déclenche
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accentColor: 'orange',
  catName: 'Mon chat',
  defaultPortionGrams: 40,
  schedules: [
    { id: '1', label: 'Matin',  time: '08:00', portionGrams: 40, enabled: true },
    { id: '2', label: 'Soir',   time: '18:00', portionGrams: 40, enabled: true },
  ],
  raspberryWsUrl: 'ws://raspberrypi.local:8765',
  useMock: true,
  lowReservoirThreshold: 20,
}

interface SettingsContextValue {
  settings: Settings
  update: (partial: Partial<Settings>) => void
  updateSchedule: (id: string, partial: Partial<FeedSchedule>) => void
  addSchedule: () => void
  removeSchedule: (id: string) => void
  reset: () => void
  isDark: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('catfeeder-settings')
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Persistance automatique
  useEffect(() => {
    localStorage.setItem('catfeeder-settings', JSON.stringify(settings))
  }, [settings])

  // Appliquer couleur + thème immédiatement au montage
  useEffect(() => {
    applyColorPalette(settings.accentColor)
    applyTheme(settings.theme)
  }, [settings.accentColor, settings.theme])

  // Écouter les changements du thème système en temps réel
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  const isDark = (() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  })()

  const update = (partial: Partial<Settings>) =>
    setSettings(s => ({ ...s, ...partial }))

  const updateSchedule = (id: string, partial: Partial<FeedSchedule>) =>
    setSettings(s => ({
      ...s,
      schedules: s.schedules.map(sc => sc.id === id ? { ...sc, ...partial } : sc),
    }))

  const addSchedule = () =>
    setSettings(s => ({
      ...s,
      schedules: [
        ...s.schedules,
        { id: Date.now().toString(), label: 'Nouveau', time: '12:00', portionGrams: s.defaultPortionGrams, enabled: true },
      ],
    }))

  const removeSchedule = (id: string) =>
    setSettings(s => ({ ...s, schedules: s.schedules.filter(sc => sc.id !== id) }))

  const reset = () => setSettings(DEFAULT_SETTINGS)

  return (
    <SettingsContext.Provider value={{ settings, update, updateSchedule, addSchedule, removeSchedule, reset, isDark }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}

