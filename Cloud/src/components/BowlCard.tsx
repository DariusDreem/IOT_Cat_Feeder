import { Utensils } from 'lucide-react'
import type { BowlStatus } from '../types'

export default function BowlCard({ bowl }: { bowl: BowlStatus }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded-lg text-orange-600 dark:text-orange-400">
          <Utensils className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Gamelle</h3>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{bowl.weightGrams} <span className="text-base font-medium text-gray-500">g</span></p>
          <p className={`text-sm mt-1 font-medium ${bowl.isEmpty ? 'text-red-500' : 'text-green-600'}`}>
            {bowl.isEmpty ? 'La gamelle est vide' : 'Nourriture disponible'}
          </p>
        </div>
      </div>
    </div>
  )
}

