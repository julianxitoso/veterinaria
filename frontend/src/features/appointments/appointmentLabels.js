export const APPOINTMENT_STATUS = {
  requested: { label: 'Solicitada', className: 'bg-amber-50 text-amber-700', card: 'border-amber-300 bg-amber-50 text-amber-900' },
  confirmed: { label: 'Confirmada', className: 'bg-sky-50 text-sky-700', card: 'border-sky-300 bg-sky-50 text-sky-900' },
  attended: { label: 'Atendida', className: 'bg-emerald-50 text-emerald-700', card: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  cancelled: { label: 'Cancelada', className: 'bg-stone-100 text-stone-500', card: 'border-stone-300 bg-stone-50 text-stone-400 line-through' },
  no_show: { label: 'No asistió', className: 'bg-rose-50 text-rose-700', card: 'border-rose-300 bg-rose-50 text-rose-700' },
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Orden de la semana empezando en lunes.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function minutesOf(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function timeOf(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Minutos desde medianoche de una fecha ISO, en hora local.
 */
export function minutesOfDate(iso) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatLongDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}
