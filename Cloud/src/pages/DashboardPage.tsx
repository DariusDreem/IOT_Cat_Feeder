import { RefreshCw } from 'lucide-react'
import { useCatFeeder } from '../context/CatFeederContext'
import AlertBanner from '../components/AlertBanner'
import ReservoirCard from '../components/ReservoirCard'
import BowlCard from '../components/BowlCard'
import HistoryPanel from '../components/HistoryPanel'

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useCatFeeder()

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto w-full pb-24">
      {data && (
        <AlertBanner
          isEmpty={data.reservoir.isEmpty}
          levelPercent={data.reservoir.levelPercent}
        />
      )}
      {isError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <div>
            <p className="font-semibold">Raspberry Pi non joignable</p>
            <p className="text-xs mt-0.5 opacity-70">Reconnexion automatique en cours…</p>
          </div>
          <RefreshCw className="w-4 h-4 animate-spin opacity-60" />
        </div>
      )}
      {isLoading ? (
        <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <ReservoirCard reservoir={data.reservoir} />
            <BowlCard bowl={data.bowl} />
          </div>
          <HistoryPanel
            feedHistory={data.feedHistory}
            fillHistory={data.fillHistory}
          />
        </>
      ) : null}
    </div>
  )
}
