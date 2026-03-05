import { Wifi, WifiOff, Cat } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { useCatFeeder } from '../context/CatFeederContext'

export default function Header() {
  const { settings } = useSettings()
  const { isConnected, data } = useCatFeeder()
  const lastUpdated = data?.reservoir.lastUpdated

  return (
    <header className="bg-brand-500 text-white px-4 pt-8 pb-5 shadow-md">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Cat className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">Cat Feeder</h1>
            <p className="text-brand-100 text-xs leading-tight">{settings.catName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-200" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-200" />
          )}
          <span className={isConnected ? 'text-green-100' : 'text-red-100'}>
            {isConnected ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
      </div>
      {lastUpdated && (
        <p className="text-brand-100 text-xs mt-1 max-w-lg mx-auto">
          Mis à jour : {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(lastUpdated))}
        </p>
      )}
    </header>
  )
}

