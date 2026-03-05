import { UtensilsCrossed } from 'lucide-react'
import type { FeedEvent } from '../types'
import { formatDateTime, timeAgo } from '../utils/formatters'

interface FeedHistoryListProps {
  feedHistory: FeedEvent[]
}

export default function FeedHistoryList({ feedHistory }: FeedHistoryListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-base text-gray-800 dark:text-gray-100">Repas servis</h2>
        </div>
        <span className="text-xs text-gray-400">{feedHistory.length} repas</span>
      </div>

      {/* Dernier repas mis en avant */}
      {feedHistory.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide">Dernier repas</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
              {timeAgo(feedHistory[0].timestamp)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(feedHistory[0].timestamp)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-500">{feedHistory[0].portionGrams}g</p>
            <p className="text-xs text-gray-400">portion</p>
          </div>
        </div>
      )}

      {/* Historique */}
      {feedHistory.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">Aucun repas enregistré</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {feedHistory.map((event) => (
            <li key={event.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{timeAgo(event.timestamp)}</p>
                <p className="text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
              </div>
              <span className="text-sm font-semibold text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-lg">
                {event.portionGrams}g
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
