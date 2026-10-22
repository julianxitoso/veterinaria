import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { useCan } from '../../hooks/useCan'
import { useDebounce } from '../../hooks/useDebounce'
import { listInvoices } from '../../services/billingService'
import { formatDateTime, formatMoney } from '../../utils/format'
import { INVOICE_FILTERS, INVOICE_STATUS, PAYMENT_STATUS } from './billingLabels'

const FILTERS = ['search', 'status', 'from', 'to', 'page']

export default function InvoicesListPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']))
  const [search, setSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(search)
  const canCreate = useCan('facturas.crear')
  const canConfigure = useCan('configuracion.editar')

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

  const { data, isPending, error } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => listInvoices({ ...filters, page: filters.page || 1 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title="Facturación"
        subtitle="Ventas, cobros y documentos"
        actions={
          <>
            <Button variant="secondary" icon={ClipboardList} to="/facturas/servicios">Servicios</Button>
            {canConfigure && <Button variant="secondary" icon={Settings} to="/configuracion/facturacion">Numeración</Button>}
            {canCreate && <Button icon={Plus} to="/facturas/nueva">Nueva venta</Button>}
          </>
        }
      />

      <Card flush>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="search"
              placeholder="Buscar por número, cliente, documento o mascota…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px] max-w-sm flex-1"
            />
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} className="w-auto" aria-label="Desde" />
            <span className="text-stone-400">–</span>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} className="w-auto" aria-label="Hasta" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(INVOICE_FILTERS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ status: key })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filters.status === key ? 'bg-brand text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
          <EmptyState>No hay facturas con estos filtros.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Saldo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/facturas/${inv.id}`} className="font-medium text-brand-dark hover:underline">
                        {inv.number ?? 'Borrador'}
                      </Link>
                      <span className="block text-xs text-muted">{formatDateTime(inv.issued_at ?? inv.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {inv.client.name}
                      {inv.pet && <span className="block text-xs text-muted">{inv.pet.name}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(inv.total)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right sm:table-cell">
                      {inv.status === 'issued' && inv.balance > 0 ? formatMoney(inv.balance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge status={INVOICE_STATUS[inv.status]} />
                        {inv.payment_status && <Badge status={PAYMENT_STATUS[inv.payment_status]} />}
                      </div>
                    </td>
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
