/**
 * SettingsPage.tsx
 * Page de configuration complète : thème, chat, portions, horaires, connexion.
 */
import { useState } from 'react'
import {
  Sun, Moon, Monitor, Cat, Sliders, Clock, Wifi,
  Plus, Trash2, RotateCcw, ChevronRight, Check,
} from 'lucide-react'
import { useSettings, type Theme, type AccentColor, type FeedSchedule } from '../context/SettingsContext'

// ---------------------------------------------------------------------------
// Helpers UI
// ---------------------------------------------------------------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-2 mt-6 first:mt-0">
      {children}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between px-4 py-3.5 gap-3">{children}</div>
}

function Label({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-brand-500 shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}

// Toggle switch
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// Stepper numérique
function Stepper({ value, onChange, min = 5, max = 200, step = 5, unit = 'g' }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; unit?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
      >−</button>
      <span className="text-base font-semibold text-gray-800 dark:text-gray-100 w-16 text-center">
        {value} {unit}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
      >+</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function ThemeSection() {
  const { settings, update } = useSettings()

  const themeOptions: { value: Theme; label: string; Icon: React.ElementType }[] = [
    { value: 'light',  label: 'Clair',   Icon: Sun },
    { value: 'dark',   label: 'Sombre',  Icon: Moon },
    { value: 'system', label: 'Système', Icon: Monitor },
  ]

  const colorOptions: { value: AccentColor; label: string; hex: string }[] = [
    { value: 'orange', label: 'Orange', hex: '#f97316' },
    { value: 'blue',   label: 'Bleu',   hex: '#3b82f6' },
    { value: 'green',  label: 'Vert',   hex: '#22c55e' },
    { value: 'purple', label: 'Violet', hex: '#a855f7' },
  ]

  return (
    <>
      <SectionTitle>Apparence</SectionTitle>
      <Card>
        {/* Thème */}
        <Row>
          <Label icon={Sun} label="Thème" />
          <div className="flex gap-1.5">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => update({ theme: value })}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                  settings.theme === value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </Row>

        {/* Couleur d'accentuation */}
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-brand-500 shrink-0" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Couleur d'accentuation</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map(({ value, label, hex }) => {
              const active = settings.accentColor === value
              return (
                <button
                  key={value}
                  onClick={() => update({ accentColor: value })}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                    active
                      ? 'border-gray-800 dark:border-white shadow-sm'
                      : 'border-transparent'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: hex }}
                  >
                    {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Aperçu en direct */}
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wide">Aperçu</p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg">🐱</div>
            <div className="flex-1">
              <div className="h-2.5 bg-brand-200 rounded-full w-3/4 mb-1.5" />
              <div className="h-2 bg-brand-100 rounded-full w-1/2" />
            </div>
            <div className="bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              Bouton
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}

function CatSection() {
  const { settings, update } = useSettings()
  return (
    <>
      <SectionTitle>Mon chat</SectionTitle>
      <Card>
        <Row>
          <Label icon={Cat} label="Nom du chat" />
          <input
            type="text"
            value={settings.catName}
            onChange={e => update({ catName: e.target.value })}
            className="text-sm text-right bg-transparent text-gray-700 dark:text-gray-200 outline-none w-28 border-b border-gray-200 dark:border-gray-600 pb-0.5 focus:border-brand-500"
            maxLength={20}
          />
        </Row>
      </Card>
    </>
  )
}

function PortionSection() {
  const { settings, update } = useSettings()
  return (
    <>
      <SectionTitle>Distribution</SectionTitle>
      <Card>
        <Row>
          <Label
            icon={Sliders}
            label="Portion par défaut"
            sub="Utilisée pour le bouton distribuer"
          />
          <Stepper
            value={settings.defaultPortionGrams}
            onChange={v => update({ defaultPortionGrams: v })}
          />
        </Row>
        <Row>
          <Label
            icon={Sliders}
            label="Alerte réservoir bas"
            sub="Déclencher l'alerte en dessous de"
          />
          <Stepper
            value={settings.lowReservoirThreshold}
            onChange={v => update({ lowReservoirThreshold: v })}
            min={5} max={50} step={5} unit="%"
          />
        </Row>
      </Card>
    </>
  )
}

function ScheduleRow({ schedule }: { schedule: FeedSchedule }) {
  const { updateSchedule, removeSchedule } = useSettings()
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        {/* Label éditable */}
        <input
          type="text"
          value={schedule.label}
          onChange={e => updateSchedule(schedule.id, { label: e.target.value })}
          className="text-sm font-medium bg-transparent text-gray-800 dark:text-gray-100 outline-none border-b border-gray-200 dark:border-gray-600 w-24 focus:border-brand-500"
        />
        <div className="flex items-center gap-3 ml-auto">
          <Toggle
            value={schedule.enabled}
            onChange={v => updateSchedule(schedule.id, { enabled: v })}
          />
          <button
            onClick={() => removeSchedule(schedule.id)}
            className="text-red-400 hover:text-red-500 active:scale-90 transition-transform"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <input
            type="time"
            value={schedule.time}
            onChange={e => updateSchedule(schedule.id, { time: e.target.value })}
            className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <Stepper
          value={schedule.portionGrams}
          onChange={v => updateSchedule(schedule.id, { portionGrams: v })}
        />
      </div>
    </div>
  )
}

function SchedulesSection() {
  const { settings, addSchedule } = useSettings()
  return (
    <>
      <SectionTitle>Horaires automatiques</SectionTitle>
      <Card>
        {settings.schedules.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">Aucun horaire configuré</p>
        )}
        {settings.schedules.map(sc => (
          <ScheduleRow key={sc.id} schedule={sc} />
        ))}
        <button
          onClick={addSchedule}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-brand-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-2xl"
        >
          <Plus className="w-4 h-4" />
          Ajouter un horaire
        </button>
      </Card>
    </>
  )
}

function ConnectionSection() {
  const { settings, update } = useSettings()
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <SectionTitle>Connexion</SectionTitle>
      <Card>
        <Row>
          <Label icon={Wifi} label="Mode simulation" sub="Données fictives sans matériel" />
          <Toggle value={settings.useMock} onChange={v => update({ useMock: v })} />
        </Row>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <Label icon={Wifi} label="Adresse Raspberry Pi" sub={settings.raspberryWsUrl} />
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <input
              type="text"
              value={settings.raspberryWsUrl}
              onChange={e => update({ raspberryWsUrl: e.target.value })}
              placeholder="ws://192.168.1.XX:8765"
              className="w-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-400"
            />
            <p className="text-xs text-gray-400 mt-1.5">Actif au prochain démarrage de l'app</p>
          </div>
        )}
      </Card>
    </>
  )
}

function DangerSection() {
  const { reset } = useSettings()
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <SectionTitle>Danger</SectionTitle>
      <Card>
        <button
          onClick={() => {
            if (confirm) { reset(); setConfirm(false) }
            else setConfirm(true)
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors rounded-2xl"
        >
          <RotateCcw className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">
            {confirm ? '⚠️ Confirmer la réinitialisation' : 'Réinitialiser tous les paramètres'}
          </span>
        </button>
      </Card>
      {confirm && (
        <p className="text-xs text-center text-gray-400 mt-1">
          Appuyez à nouveau pour confirmer
        </p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  return (
    <div className="px-4 py-5 space-y-1 max-w-lg mx-auto w-full pb-24">
      <ThemeSection />
      <CatSection />
      <PortionSection />
      <SchedulesSection />
      <ConnectionSection />
      <DangerSection />
    </div>
  )
}

