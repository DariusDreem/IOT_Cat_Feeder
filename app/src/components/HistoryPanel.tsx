/**
 * HistoryPanel.tsx
 * Les deux historiques (repas + remplissages) côte à côte,
 * chacun avec sa propre pagination.
 */
import { useState, useEffect } from 'react'
import { UtensilsCrossed, Droplets, User, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FeedEvent, FillEvent } from '../types'
import { formatDateTime, timeAgo } from '../utils/formatters'

const PAGE_SIZE = 5

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------
function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-gray-400">
        {total === 0 ? '–' : `${page + 1} / ${maxPage + 1}`}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= maxPage}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Colonne Repas
// ---------------------------------------------------------------------------
function FeedColumn({ feedHistory }: { feedHistory: FeedEvent[] }) {
  const [page, setPage] = useState(0)

  // Revenir à la page 0 si de nouveaux éléments arrivent
  useEffect(() => { setPage(0) }, [feedHistory.length])

  const start = page * PAGE_SIZE
  const slice = feedHistory.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col gap-2">
      {/* En-tête */}
      <div className="flex items-center gap-1.5">
        <UtensilsCrossed className="w-4 h-4 text-brand-500 shrink-0" />
        <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">Repas</h2>
        <span className="ml-auto text-xs text-gray-400 shrink-0">{feedHistory.length}</span>
      </div>

      {/* Liste — hauteur fixe pour éviter le saut au changement de page */}
      <ul className="flex-1 space-y-0 divide-y divide-gray-100 dark:divide-gray-700 min-h-[160px]">
        {feedHistory.length === 0 ? (
          <li className="flex items-center justify-center h-full py-6">
            <span className="text-gray-400 text-xs">Aucun repas</span>
          </li>
        ) : slice.map((event) => (
          <li key={`feed-${page}-${event.id}`} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                {timeAgo(event.timestamp)}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {formatDateTime(event.timestamp)}
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-lg shrink-0">
              {event.portionGrams}g
            </span>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        total={feedHistory.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Colonne Remplissages
// ---------------------------------------------------------------------------
function FillColumn({ fillHistory }: { fillHistory: FillEvent[] }) {
  const [page, setPage] = useState(0)

  // Revenir à la page 0 si de nouveaux éléments arrivent
  useEffect(() => { setPage(0) }, [fillHistory.length])

  const start = page * PAGE_SIZE
  const slice = fillHistory.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col gap-2">
      {/* En-tête */}
      <div className="flex items-center gap-1.5">
        <Droplets className="w-4 h-4 text-brand-500 shrink-0" />
        <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">Remplissages</h2>
        <span className="ml-auto text-xs text-gray-400 shrink-0">{fillHistory.length}</span>
      </div>

      {/* Liste — hauteur fixe pour éviter le saut au changement de page */}
      <ul className="flex-1 space-y-0 divide-y divide-gray-100 dark:divide-gray-700 min-h-[160px]">
        {fillHistory.length === 0 ? (
          <li className="flex items-center justify-center h-full py-6">
            <span className="text-gray-400 text-xs">Aucun</span>
          </li>
        ) : slice.map((event) => (
          <li key={`fill-${page}-${event.id}`} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                {timeAgo(event.timestamp)}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {formatDateTime(event.timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-lg shrink-0">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[50px]">{event.filledByUser}</span>
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        total={fillHistory.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------
export default function HistoryPanel({
  feedHistory,
  fillHistory,
}: {
  feedHistory: FeedEvent[]
  fillHistory: FillEvent[]
}) {
  return (
    <div className="flex gap-3 items-start">
      <FeedColumn feedHistory={feedHistory} />
      <FillColumn fillHistory={fillHistory} />
    </div>
  )
}




