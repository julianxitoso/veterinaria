import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarClock, History, Plus, TrendingDown, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { useCan } from '../../hooks/useCan'
import { useDebounce } from '../../hooks/useDebounce'
import { getInventoryAlerts, getProductOptions, listProducts } from '../../services/inventoryService'
import { formatMoney } from '../../utils/format'
import { PRODUCT_FILTERS } from './inventoryLabels'
import { ExpiryBadge, StockBadge } from './StockBadge'

const FILTERS = ['search', 'filter', 'category', 'page']

export default function ProductsListPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']))
  const [search, setSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(search)
  const canCreate = useCan('inventario.crear')

  const setFilters = (changes) => {
    const next = { ...filters, page: '', ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) {
      const next = Object.fromEntries([...params.entries()].filter(([k]) => k !== 'page' && k !== 'search'))
      if (debouncedSearch) next.search = debouncedSearch
      setParams(next, { replace: true })
    }
  }, [debouncedSearch, params, setParams])

  const { data: alerts } = useQuery({ queryKey: ['inventory-alerts'], queryFn: getInventoryAlerts })
  const { data: options } = useQuery({ queryKey: ['product-options'], queryFn: getProductOptions, staleTime: 5 * 60_000 })

  const { data, isPending, error } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => listProducts({ ...filters, page: filters.page || 1 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Productos, existencias y vencimientos"
        actions={
          <>
            <Button variant="secondary" icon={History} to="/inventario/movimientos">Movimientos</Button>
            {canCreate && <Button icon={Plus} to="/inventario/nuevo">Nuevo producto</Button>}
          </>
        }
      />

      {alerts && (
        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <AlertCard
            icon={TrendingDown}
            label="Stock bajo"
            count={alerts.low_stock}
            tone="amber"
            active={filters.filter === 'low_stock'}
            onClick={() => setFilters({ filter: filters.filter === 'low_stock' ? '' : 'low_stock' })}
          />
          <AlertCard
            icon={CalendarClock}
            label="Por vencer (30 días)"
            count={alerts.expiring}
            tone="amber"
            active={filters.filter === 'expiring'}
            onClick={() => setFilters({ filter: filters.filter === 'expiring' ? '' : 'expiring' })}
          />
          <AlertCard
            icon={TriangleAlert}
            label="Vencidos con existencias"
            count={alerts.expired}
            tone="rose"
            active={filters.filter === 'expiring'}
            onClick={() => setFilters({ filter: filters.filter === 'expiring' ? '' : 'expiring' })}
          />
        </div>
      )}

      <Card flush>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap gap-3">
            <Input
              type="search"
              placeholder="Buscar por nombre, código o proveedor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px] max-w-sm flex-1"
            />
            <Select value={filters.category} onChange={(e) => setFilters({ category: e.target.value })} className="w-auto">
              <option value="">Todas las categorías</option>
              {options?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRODUCT_FILTERS).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ filter: key })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filters.filter === key ? 'bg-brand text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : data.data.length === 0 ? (
          <EmptyState>No hay productos con estos filtros.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Precio</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link to={`/inventario/${p.id}`} className="font-medium text-brand-dark hover:underline">{p.name}</Link>
                      <span className="block text-xs text-muted">{[p.code, p.category].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="px-4 py-3"><StockBadge product={p} /></td>
                    <td className="hidden px-4 py-3 text-right sm:table-cell">{formatMoney(p.price)}</td>
                    <td className="hidden px-4 py-3 md:table-cell"><ExpiryBadge product={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination meta={data?.meta} onPageChange={(p) => setFilters({ page: String(p) })} />
      </Card>
    </div>
  )
}

function AlertCard({ icon: Icon, label, count, tone, active, onClick }) {
  // sin alertas la tarjeta queda neutra; con alertas toma un tinte suave
  const tones = {
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl border bg-white p-3 text-left shadow-card transition hover:border-line-strong sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${
        active ? 'border-brand ring-4 ring-brand/10' : 'border-line'
      }`}
    >
      <span className={`flex size-10 items-center justify-center rounded-xl ${count > 0 ? tones[tone] : 'bg-stone-100 text-stone-400'}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="tabular block text-[22px] font-semibold leading-tight text-ink">{count}</span>
        <span className="text-xs leading-tight text-muted sm:text-[13px]">{label}</span>
      </span>
    </button>
  )
}
