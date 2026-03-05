/**
 * CatFeederContext.tsx
 * Contexte partagé pour les données temps réel (WebSocket).
 * Évite d'ouvrir plusieurs connexions WebSocket.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { useCatFeederData as _useCatFeederData, useTriggerFeed, useConfirmFill } from '../hooks/useCatFeeder'
import type { CatFeederState } from '../types'

interface CatFeederContextValue {
  data: CatFeederState | null
  isConnected: boolean
  isLoading: boolean
  isError: boolean
  triggerFeed: (portionGrams?: number) => void
  confirmFill: (filledByUser?: string) => void
}

const CatFeederContext = createContext<CatFeederContextValue | null>(null)

export function CatFeederProvider({ children }: { children: ReactNode }) {
  const { data, isConnected, isLoading, isError } = _useCatFeederData()
  const { mutate: triggerFeed } = useTriggerFeed()
  const { mutate: confirmFill } = useConfirmFill()

  return (
    <CatFeederContext.Provider value={{ data, isConnected, isLoading, isError, triggerFeed, confirmFill }}>
      {children}
    </CatFeederContext.Provider>
  )
}

export function useCatFeeder() {
  const ctx = useContext(CatFeederContext)
  if (!ctx) throw new Error('useCatFeeder must be used inside CatFeederProvider')
  return ctx
}

