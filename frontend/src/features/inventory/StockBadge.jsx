import { formatDate, formatQty } from '../../utils/format'

/**
 * Stock con color según el estado: rojo agotado, ámbar bajo el mínimo.
 */
export function StockBadge({ product }) {
  const stock = Number(product.stock)
  const className =
    stock <= 0
      ? 'bg-rose-50 text-rose-700'
      : product.is_low_stock
        ? 'bg-amber-50 text-amber-700'
        : 'bg-stone-100 text-stone-600'

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {stock <= 0 ? 'Agotado' : `${formatQty(stock)} ${product.unit}`}
    </span>
  )
}

export function ExpiryBadge({ product }) {
  if (!product.expires_at) return <span className="text-stone-400">—</span>

  const styles = {
    expired: 'bg-rose-50 text-rose-700',
    expiring: 'bg-amber-50 text-amber-700',
  }

  if (!product.expiry_status) {
    return <span className="text-sm text-stone-600">{formatDate(product.expires_at)}</span>
  }

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${styles[product.expiry_status]}`}>
      {product.expiry_status === 'expired' ? 'Vencido' : 'Vence'} {formatDate(product.expires_at)}
    </span>
  )
}
