import type { AccentColor } from '../context/SettingsContext'

/** Palettes complètes pour chaque couleur d'accentuation */
export const COLOR_PALETTES: Record<AccentColor, Record<string, string>> = {
  orange: {
    '--brand-50':  '#fff7ed',
    '--brand-100': '#ffedd5',
    '--brand-200': '#fed7aa',
    '--brand-300': '#fdba74',
    '--brand-400': '#fb923c',
    '--brand-500': '#f97316',
    '--brand-600': '#ea580c',
    '--brand-700': '#c2410c',
    '--brand-800': '#9a3412',
    '--brand-900': '#7c2d12',
  },
  blue: {
    '--brand-50':  '#eff6ff',
    '--brand-100': '#dbeafe',
    '--brand-200': '#bfdbfe',
    '--brand-300': '#93c5fd',
    '--brand-400': '#60a5fa',
    '--brand-500': '#3b82f6',
    '--brand-600': '#2563eb',
    '--brand-700': '#1d4ed8',
    '--brand-800': '#1e40af',
    '--brand-900': '#1e3a8a',
  },
  green: {
    '--brand-50':  '#f0fdf4',
    '--brand-100': '#dcfce7',
    '--brand-200': '#bbf7d0',
    '--brand-300': '#86efac',
    '--brand-400': '#4ade80',
    '--brand-500': '#22c55e',
    '--brand-600': '#16a34a',
    '--brand-700': '#15803d',
    '--brand-800': '#166534',
    '--brand-900': '#14532d',
  },
  purple: {
    '--brand-50':  '#faf5ff',
    '--brand-100': '#f3e8ff',
    '--brand-200': '#e9d5ff',
    '--brand-300': '#d8b4fe',
    '--brand-400': '#c084fc',
    '--brand-500': '#a855f7',
    '--brand-600': '#9333ea',
    '--brand-700': '#7e22ce',
    '--brand-800': '#6b21a8',
    '--brand-900': '#581c87',
  },
}

/** Applique une palette de couleurs sur :root */
export function applyColorPalette(color: AccentColor) {
  const palette = COLOR_PALETTES[color]
  const root = document.documentElement
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

/** Applique le thème (dark/light) sur <html> */
export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

