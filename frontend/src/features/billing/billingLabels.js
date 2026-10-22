export const INVOICE_STATUS = {
  draft: { label: 'Borrador', className: 'bg-stone-100 text-stone-600' },
  issued: { label: 'Emitida', className: 'bg-sky-50 text-sky-700' },
  voided: { label: 'Anulada', className: 'bg-rose-50 text-rose-700' },
}

export const PAYMENT_STATUS = {
  unpaid: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700' },
  partial: { label: 'Abono parcial', className: 'bg-orange-50 text-orange-700' },
  paid: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700' },
}

export const PAYMENT_METHODS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  other: 'Otro',
}

export const INVOICE_FILTERS = {
  '': 'Todas',
  draft: 'Borradores',
  pending: 'Por cobrar',
  issued: 'Emitidas',
  voided: 'Anuladas',
}

/**
 * Mismo cálculo que el backend, para mostrar totales mientras se edita.
 */
export function calcLine({ quantity, unit_price, discount_pct, tax_rate }) {
  const n = (v) => Number(String(v ?? '').replace(',', '.')) || 0
  const gross = round(n(quantity) * n(unit_price))
  const subtotal = round(gross * (1 - n(discount_pct) / 100))
  const tax = round((subtotal * n(tax_rate)) / 100)
  return { gross, subtotal, tax, total: subtotal + tax }
}

export function calcTotals(items) {
  return items.reduce(
    (acc, item) => {
      const line = calcLine(item)
      acc.subtotal += line.gross
      acc.discount += line.gross - line.subtotal
      acc.tax += line.tax
      acc.total += line.total
      return acc
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  )
}

function round(value) {
  return Math.round(value * 100) / 100
}
