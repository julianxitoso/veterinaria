import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Card, DetailList, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { getProduct } from '../../services/inventoryService'
import { formatMoney, formatQty } from '../../utils/format'
import MovementForm from './MovementForm'
import MovementsTable from './MovementsTable'
import { ExpiryBadge } from './StockBadge'

export default function ProductDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const canEdit = useCan('inventario.editar')
  const canMove = useCan('inventario.mover-stock')

  const { data: p, isPending, error } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) })

  if (isPending) return <Spinner />
  if (error) return <ErrorState error={error} />

  const onMoved = (updated) => {
    queryClient.setQueryData(['product', id], updated)
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['movements'] })
  }

  const stock = Number(p.stock)
  const stockTone = stock <= 0 ? 'text-red-600' : p.is_low_stock ? 'text-amber-600' : 'text-ink'

  return (
    <div>
      <PageHeader
        title={p.name}
        subtitle={[p.code, p.category, !p.is_active && 'Inactivo'].filter(Boolean).join(' · ')}
        back="/inventario"
        actions={canEdit && <Button variant="secondary" icon={Pencil} to={`/inventario/${id}/editar`}>Editar producto</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card>
            <p className="text-sm text-muted">Existencias</p>
            <p className={`mt-1 text-4xl font-semibold ${stockTone}`}>
              {formatQty(stock)} <span className="text-base font-normal text-muted">{p.unit}</span>
            </p>
            <p className="mt-1 text-sm text-muted">Mínimo: {formatQty(p.min_stock)} {p.unit}</p>
            {stock <= 0 ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Producto agotado.</p>
            ) : p.is_low_stock && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Por debajo del stock mínimo: conviene pedir.</p>
            )}
            <div className="mt-3 text-sm">
              <span className="text-muted">Próximo vencimiento: </span>
              <ExpiryBadge product={p} />
            </div>
          </Card>

          <Card title="Precios">
            <DetailList
              items={[
                ['Precio de venta', formatMoney(p.price)],
                ['Costo', formatMoney(p.cost)],
                ['IVA', `${Number(p.tax_rate)}%`],
                ['Margen', Number(p.price) > 0 ? `${(((p.price - p.cost) / p.price) * 100).toFixed(0)}%` : '—'],
              ]}
            />
          </Card>

          <Card title="Otros datos">
            <DetailList items={[['Proveedor', p.supplier], ['Notas', p.notes]]} />
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {canMove && p.is_active && (
            <Card title="Registrar movimiento">
              <MovementForm product={p} onSaved={onMoved} />
            </Card>
          )}

          <Card
            flush
            title="Últimos movimientos"
            actions={
              <Link to={`/inventario/movimientos?product_id=${p.id}`} className="text-sm text-brand-dark hover:underline">
                Ver todos
              </Link>
            }
          >
            {p.movements.length === 0 ? (
              <EmptyState>Sin movimientos.</EmptyState>
            ) : (
              <MovementsTable movements={p.movements} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
