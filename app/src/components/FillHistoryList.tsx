import { Droplets, User } from 'lucide-react'
import type { FillEvent } from '../types'
import { formatDateTime, timeAgo } from '../utils/formatters'

interface FillHistoryListProps {
  fillHistory: FillEvent[]
}

export default function FillHistoryList({ fillHistory }: FillHistoryListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-base text-gray-800 dark:text-gray-100">Remplissages</h2>
        </div>
        <span className="text-xs text-gray-400">{fillHistory.length} fois</span>
      </div>

      {/* Dernier remplissage mis en avant */}
      {fillHistory.length > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide">Dernier remplissage</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
              {timeAgo(fillHistory[0].timestamp)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(fillHistory[0].timestamp)}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/40 px-2.5 py-1.5 rounded-lg">
            <User className="w-3.5 h-3.5" />
            <span className="font-medium">{fillHistory[0].filledByUser}</span>
          </div>
        </div>
      )}

      {/* Historique */}
      {fillHistory.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-2">Aucun remplissage enregistré</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {fillHistory.map((event) => (
            <li key={event.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{timeAgo(event.timestamp)}</p>
                <p className="text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-lg">
                <User className="w-3.5 h-3.5" />
                <span>{event.filledByUser}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
