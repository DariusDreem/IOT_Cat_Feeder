import { useState } from 'react'
import { SettingsProvider } from './context/SettingsContext'
import { CatFeederProvider } from './context/CatFeederContext'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import ScrollArea from './components/ScrollArea'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

type Page = 'dashboard' | 'settings'

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 flex flex-col transition-colors duration-200">
      <Header />

      <ScrollArea>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'settings'  && <SettingsPage />}
      </ScrollArea>

      <BottomNav current={page} onChange={setPage} />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <CatFeederProvider>
        <AppContent />
      </CatFeederProvider>
    </SettingsProvider>
  )
}
