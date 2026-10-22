import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { formatDate, formatDateTime, formatQty } from '../../utils/format'
import { MOVEMENT_TYPES } from './inventoryLabels'

/**
 * Tabla de kardex. Con `showProduct` incluye la columna del producto.
 */
export default function MovementsTable({ movements, showProduct = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Fecha</th>
            {showProduct && <th className="px-4 py-3 font-medium">Producto</th>}
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 text-right font-medium">Cantidad</th>
            <th className="px-4 py-3 text-right font-medium">Saldo</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {movements.map((m) => {
            const qty = Number(m.quantity)
            return (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                  {formatDateTime(m.created_at)}
                  <span className="block text-xs text-stone-400">{m.user?.name}</span>
                </td>
                {showProduct && (
                  <td className="px-4 py-3">
                    <Link to={`/inventario/${m.product.id}`} className="text-brand-dark hover:underline">{m.product.name}</Link>
                  </td>
                )}
                <td className="px-4 py-3"><Badge status={MOVEMENT_TYPES[m.type]} /></td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${qty < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {qty > 0 ? '+' : ''}{formatQty(qty)}
                </td>
                <td className="px-4 py-3 text-right">{formatQty(m.stock_after)}</td>
                <td className="hidden px-4 py-3 text-stone-600 md:table-cell">
                  {m.reason}
                  <span className="block text-xs text-stone-400">
                    {[m.reference && `Ref. ${m.reference}`, m.lot && `Lote ${m.lot}`, m.expires_at && `Vence ${formatDate(m.expires_at)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
