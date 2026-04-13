import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'

interface AlertBannerProps {
  isEmpty: boolean
  levelPercent: number
}

export default function AlertBanner({ isEmpty, levelPercent }: AlertBannerProps) {
  const { settings } = useSettings()
  const [dismissed, setDismissed] = useState(false)

  const showAlert = !dismissed && (isEmpty || levelPercent <= settings.lowReservoirThreshold)
  if (!showAlert) return null

  const isEmptyAlert = isEmpty || levelPercent === 0

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-sm ${
        isEmptyAlert
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
      }`}
    >
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-sm">
          {isEmptyAlert ? '⚠️ Réservoir vide !' : '⚠️ Réservoir presque vide'}
        </p>
        <p className="text-xs mt-0.5">
          {isEmptyAlert
            ? 'Le distributeur ne peut plus servir de repas. Veuillez remplir le réservoir.'
            : `Il reste seulement ${levelPercent}% de croquettes. Pensez à remplir bientôt.`}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
        aria-label="Fermer l'alerte"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
