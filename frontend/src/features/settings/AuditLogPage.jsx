import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { listAuditLogs, listUsers } from '../../services/adminService'
import { formatDateTime } from '../../utils/format'
import { AUDIT_ACTIONS, AUDIT_GROUPS, FIELD_LABELS } from '../admin/adminLabels'
import SettingsTabs from './SettingsTabs'

const FILTERS = ['action', 'user_id', 'from', 'to', 'page']

/**
 * Registro de acciones críticas: quién hizo qué y cuándo.
 */
export default function AuditLogPage() {
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']))

  const setFilters = (changes) => {
    const next = { ...filters, page: '', ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const { data, isPending } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => listAuditLogs({ ...filters, page: filters.page || 1 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="max-w-4xl">
      <PageHeader title="Configuración" subtitle="Auditoría de acciones críticas" />
      <SettingsTabs />

      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Select value={filters.action} onChange={(e) => setFilters({ action: e.target.value })} className="w-auto">
            <option value="">Todas las acciones</option>
            {Object.entries(AUDIT_GROUPS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
          <Select value={filters.user_id} onChange={(e) => setFilters({ user_id: e.target.value })} className="w-auto">
            <option value="">Todos los usuarios</option>
            {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} className="w-auto" aria-label="Desde" />
          <span className="text-stone-400">–</span>
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} className="w-auto" aria-label="Hasta" />
        </div>

        {isPending ? (
          <Spinner />
        ) : data.data.length === 0 ? (
          <EmptyState>No hay registros con estos filtros.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {data.data.map((log) => {
              const action = AUDIT_ACTIONS[log.action] ?? { label: log.action, icon: '•' }
              return (
                <li key={log.id} className="flex gap-3 px-5 py-3">
                  <span className="mt-0.5 text-lg">{action.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.name ?? 'Sistema'}</span>{' '}
                        <span className="text-stone-600">· {log.description}</span>
                      </p>
                      <span className="whitespace-nowrap text-xs text-stone-400">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="text-xs text-stone-400">
                      {action.label}
                      {log.ip_address && ` · IP ${log.ip_address}`}
                    </p>
                    {log.changes && <Changes changes={log.changes} />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Pagination meta={data?.meta} onPageChange={(p) => setFilters({ page: String(p) })} />
      </Card>
    </div>
  )
}

function Changes({ changes }) {
  const show = (v) => (Array.isArray(v) ? v.join(', ') || '—' : v === null || v === '' ? '—' : String(v))

  return (
    <dl className="mt-1.5 space-y-0.5 rounded-lg bg-stone-50 px-3 py-2 text-xs">
      {Object.entries(changes).map(([field, [before, after]]) => (
        <div key={field} className="flex flex-wrap gap-1">
          <dt className="font-medium text-stone-600">{FIELD_LABELS[field] ?? field}:</dt>
          <dd className="text-muted">
            {before !== null && before !== undefined && (
              <><span className="line-through">{show(before)}</span> → </>
            )}
            <span className="text-ink">{show(after)}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
