export const MOVEMENT_TYPES = {
  entry: { label: 'Entrada', icon: '⬇️', className: 'bg-emerald-50 text-emerald-700' },
  exit: { label: 'Salida', icon: '⬆️', className: 'bg-orange-50 text-orange-700' },
  adjustment: { label: 'Ajuste', icon: '⚖️', className: 'bg-sky-50 text-sky-700' },
  sale: { label: 'Venta', icon: '🧾', className: 'bg-violet-50 text-violet-700' },
}

export const PRODUCT_FILTERS = {
  '': { label: 'Activos' },
  low_stock: { label: 'Stock bajo' },
  expiring: { label: 'Por vencer / vencidos' },
  inactive: { label: 'Inactivos' },
}

export const EXIT_REASONS = ['Uso interno / procedimiento', 'Producto vencido', 'Producto dañado', 'Devolución a proveedor', 'Donación']

export const TAX_RATES = [0, 5, 19]
