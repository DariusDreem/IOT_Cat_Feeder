/** Normalise un timestamp ISO (gère +00:00 et Z) vers un objet Date fiable */
function parseISO(iso: string): Date {
  // Remplace +00:00 par Z pour compatibilité maximale navigateurs
  return new Date(iso.replace(/\+00:00$/, 'Z'))
}

/** Formate un timestamp ISO en date/heure lisible en français */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseISO(iso))
}

/** Retourne une durée relative (ex. "il y a 5 min") */
export function timeAgo(iso: string): string {
  const diff = Date.now() - parseISO(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "à l\u2019instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days} j`
}
