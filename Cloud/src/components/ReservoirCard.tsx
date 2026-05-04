import { Package, CheckCircle, Loader2, Zap } from 'lucide-react'
import { useState } from 'react'
import type { ReservoirStatus } from '../types'
import { useCatFeeder } from '../context/CatFeederContext'
import { useSettings } from '../context/SettingsContext'
import { timeAgo } from '../utils/formatters'

interface ReservoirCardProps {
  reservoir: ReservoirStatus
}

function getLevelColor(pct: number): string {
  if (pct <= 10) return 'bg-red-500'
  if (pct <= 30) return 'bg-yellow-400'
  if (pct <= 60) return 'bg-lime-400'
  return 'bg-green-500'
}

function getLevelTextColor(pct: number): string {
  if (pct <= 10) return 'text-red-600'
  if (pct <= 30) return 'text-yellow-600'
  return 'text-green-600'
}

export default function ReservoirCard({ reservoir }: ReservoirCardProps) {
  const { confirmFill, triggerFeed } = useCatFeeder()
  const { settings } = useSettings()
  const [pendingFill, setPendingFill] = useState(false)
  const [pendingFeed, setPendingFeed] = useState(false)

  const handleFill = () => {
    setPendingFill(true)
    confirmFill('François')
    setTimeout(() => setPendingFill(false), 400)
  }

  const handleFeed = () => {
    setPendingFeed(true)
    triggerFeed(settings.defaultPortionGrams)
    setTimeout(() => setPendingFeed(false), 400)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Titre */}
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-brand-500" />
        <h2 className="font-semibold text-base text-gray-800 dark:text-gray-100">Réservoir</h2>
        <span className="ml-auto text-xs text-gray-400">
          {timeAgo(reservoir.lastUpdated)}
        </span>
      </div>

      {/* Jauge */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-500 dark:text-gray-400">Niveau actuel</span>
          <span className={`text-2xl font-bold ${getLevelTextColor(reservoir.levelPercent)}`}>
            {reservoir.levelPercent}%
          </span>
        </div>
        <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getLevelColor(reservoir.levelPercent)}`}
            style={{ width: `${reservoir.levelPercent}%` }}
          />
        </div>
        <p className={`text-xs font-medium ${getLevelTextColor(reservoir.levelPercent)}`}>
          {reservoir.isEmpty
            ? 'Réservoir vide — remplissage nécessaire'
            : reservoir.levelPercent <= 20
            ? 'Niveau bas — pensez à remplir'
            : reservoir.levelPercent <= 60
            ? 'Niveau correct'
            : 'Réservoir bien rempli'}
        </p>
      </div>

      {/* Boutons côte à côte */}
      <div className="flex gap-2">
        <button
          onClick={handleFeed}
          disabled={pendingFeed}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-150 text-sm"
        >
          {pendingFeed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {pendingFeed ? 'Distribution…' : `Distribuer (${settings.defaultPortionGrams}g)`}
        </button>

        <button
          onClick={handleFill}
          disabled={pendingFill}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-150 text-sm"
        >
          {pendingFill ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {pendingFill ? 'Enregistrement…' : 'Rempli'}
        </button>
      </div>
    </div>
  )
}


