import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { listMovements } from '../../services/inventoryService'
import { MOVEMENT_TYPES } from './inventoryLabels'
import MovementsTable from './MovementsTable'

const FILTERS = ['product_id', 'type', 'from', 'to', 'page']

/**
 * Kardex general: todos los movimientos de inventario con filtros.
 */
export default function MovementsPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']))

  const setFilters = (changes) => {
    const next = { ...filters, page: '', ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }

  const { data, isPending, error } = useQuery({
    queryKey: ['movements', filters],
    queryFn: () => listMovements({ ...filters, page: filters.page || 1 }),
    placeholderData: keepPreviousData,
  })

  const productName = filters.product_id && data?.data[0]?.product.name

  return (
    <div>
      <PageHeader
        title="Movimientos de inventario"
        subtitle={productName ? `Producto: ${productName}` : 'Entradas, salidas, ajustes y ventas'}
        back={filters.product_id ? `/inventario/${filters.product_id}` : '/inventario'}
      />

      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })} className="w-auto">
            <option value="">Todos los tipos</option>
            {Object.entries(MOVEMENT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </Select>
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} className="w-auto" aria-label="Desde" />
          <span className="text-stone-400">–</span>
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} className="w-auto" aria-label="Hasta" />
          {filters.product_id && (
            <button type="button" className="text-sm text-brand-dark hover:underline" onClick={() => setFilters({ product_id: '' })}>
              Ver todos los productos
            </button>
          )}
        </div>

        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : data.data.length === 0 ? (
          <EmptyState>No hay movimientos con estos filtros.</EmptyState>
        ) : (
          <MovementsTable movements={data.data} showProduct={!filters.product_id} />
        )}

        <Pagination meta={data?.meta} onPageChange={(p) => setFilters({ page: String(p) })} />
      </Card>
    </div>
  )
}
