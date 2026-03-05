import { LayoutDashboard, Settings } from 'lucide-react'

type Page = 'dashboard' | 'settings'

interface BottomNavProps {
  current: Page
  onChange: (page: Page) => void
}

const tabs = [
  { id: 'dashboard' as Page, label: 'Tableau de bord', Icon: LayoutDashboard },
  { id: 'settings'  as Page, label: 'Paramètres',      Icon: Settings },
]

export default function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-bottom z-50">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ id, label, Icon }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active
                  ? 'text-brand-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

