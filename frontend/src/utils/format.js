const LOCALE = 'es-CO'

export function formatDate(value) {
  if (!value) return null
  // las fechas sin hora (YYYY-MM-DD) se interpretan en hora local, no UTC
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return null
  return new Date(value).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export function formatMoney(value) {
  if (value == null || value === '') return '—'
  return money.format(Number(value))
}

/**
 * Cantidades sin decimales innecesarios: "12", "2,5".
 */
export function formatQty(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString(LOCALE, { maximumFractionDigits: 2 })
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Valor para <input type="datetime-local"> (hora local, sin zona).
 */
export function toDateTimeLocal(value = new Date()) {
  const date = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function todayISO() {
  return toDateTimeLocal().slice(0, 10)
}
