import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { useCan } from '../../hooks/useCan'
import { useDebounce } from '../../hooks/useDebounce'
import { listConsultations, listVeterinarians } from '../../services/consultationsService'
import { formatDateTime, todayISO } from '../../utils/format'
import { CONSULTATION_STATUS } from './consultationLabels'

const FILTERS = ['search', 'status', 'user_id', 'from', 'to', 'page']

export default function ConsultationsListPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']))
  const [search, setSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(search)
  const canCreate = useCan('consultas.crear')

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

  const { data: vets } = useQuery({ queryKey: ['veterinarians'], queryFn: listVeterinarians, staleTime: 5 * 60_000 })

  const { data, isPending, error } = useQuery({
    queryKey: ['consultations', filters],
    queryFn: () => listConsultations({ ...filters, page: filters.page || 1 }),
    placeholderData: keepPreviousData,
  })

  const today = todayISO()
  const isToday = filters.from === today && filters.to === today

  return (
    <div>
      <PageHeader
        title="Consultas"
        subtitle="Entradas de pacientes y atenciones"
        actions={canCreate && <Button icon={Plus} to="/consultas/nueva">Nueva consulta</Button>}
      />

      <Card flush>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <Input
            type="search"
            placeholder="Buscar por paciente, dueño, motivo o diagnóstico…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] max-w-xs flex-1"
          />
          <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} className="w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(CONSULTATION_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </Select>
          <Select value={filters.user_id} onChange={(e) => setFilters({ user_id: e.target.value })} className="w-auto">
            <option value="">Todos los veterinarios</option>
            {vets?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} className="w-auto" aria-label="Desde" />
            <span className="text-stone-400">–</span>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} className="w-auto" aria-label="Hasta" />
          </div>
          <Button
            variant={isToday ? 'primary' : 'secondary'}
            onClick={() => setFilters(isToday ? { from: '', to: '' } : { from: today, to: today })}
          >
            Hoy
          </Button>
        </div>

        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : data.data.length === 0 ? (
          <EmptyState>No hay consultas con estos filtros.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Veterinario</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      <Link to={`/consultas/${c.id}`} className="hover:underline">{formatDateTime(c.consulted_at)}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/consultas/${c.id}`} className="font-medium text-brand-dark hover:underline">{c.pet.name}</Link>
                      <span className="block text-xs text-muted">{c.pet.species} · {c.pet.client?.name}</span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3">{c.reason}</td>
                    <td className="hidden px-4 py-3 text-stone-600 lg:table-cell">{c.veterinarian?.name}</td>
                    <td className="px-4 py-3"><Badge status={CONSULTATION_STATUS[c.status]} /></td>
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
