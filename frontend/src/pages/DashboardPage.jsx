import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Globe,
  Package,
  PawPrint,
  Receipt,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import { Card, EmptyState, StatCard } from '../components/ui/Layout'
import { APPOINTMENT_STATUS } from '../features/appointments/appointmentLabels'
import { useNow } from '../hooks/useNow'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { formatMoney } from '../utils/format'

// "jueves, 22 de octubre" → "Jueves, 22 de octubre" (CSS capitalize pondría "De")
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

async function getDashboard() {
  const { data } = await api.get('/dashboard')
  return data.data
}

const QUICK_ACTIONS = [
  { to: '/consultas/nueva', label: 'Nueva consulta', icon: Stethoscope, permission: 'consultas.crear' },
  { to: '/citas', label: 'Agendar cita', icon: CalendarPlus, permission: 'citas.crear' },
  { to: '/pacientes/nuevo', label: 'Registrar mascota', icon: PawPrint, permission: 'pacientes.crear' },
  { to: '/clientes/nuevo', label: 'Nuevo cliente', icon: UserPlus, permission: 'pacientes.crear' },
  { to: '/facturas/nueva', label: 'Nueva venta', icon: Receipt, permission: 'facturas.crear' },
]

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const now = useNow()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard, refetchInterval: 60_000 })

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const can = (p) => user?.permissions?.includes(p)
  const actions = QUICK_ACTIONS.filter((a) => can(a.permission))

  const a = data?.appointments
  const c = data?.consultations
  const s = data?.sales
  const inv = data?.inventory
  const inventoryAlerts = inv ? inv.low_stock + inv.expiring : 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{capitalize(now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
        <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
      </div>

      {a?.requested > 0 && (
        <Link
          to="/citas"
          className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-50"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Globe className="size-4" /></span>
          <span className="flex-1">
            <strong>{a.requested}</strong> solicitud(es) de cita en línea por confirmar
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {a && (
            <StatCard icon={CalendarDays} label="Citas de hoy" value={a.today} hint={`${a.attended} atendida(s)`} to="/citas" />
          )}
          {c && (
            <StatCard
              icon={Stethoscope}
              tone="sky"
              label="Consultas de hoy"
              value={c.today}
              hint={c.open ? `${c.open} en curso` : 'Ninguna en curso'}
              to="/consultas"
            />
          )}
          {s && (
            <StatCard
              icon={Wallet}
              tone="violet"
              label="Ventas de hoy"
              value={formatMoney(s.today_total)}
              hint={`${s.today_count} factura(s) · Mes: ${formatMoney(s.month_total)}`}
              to="/facturas"
            />
          )}
          {s && (
            <StatCard
              icon={Receipt}
              tone={s.receivable > 0 ? 'amber' : 'stone'}
              label="Por cobrar"
              value={formatMoney(s.receivable)}
              hint={s.drafts ? `${s.drafts} borrador(es) sin emitir` : 'Sin borradores pendientes'}
              to="/facturas?status=pending"
            />
          )}
          {inv && !s && (
            <StatCard
              icon={Package}
              tone={inventoryAlerts ? 'rose' : 'stone'}
              label="Alertas de inventario"
              value={inventoryAlerts}
              hint={`${inv.low_stock} con stock bajo · ${inv.expiring} por vencer`}
              to="/inventario"
            />
          )}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {a && (
          <Card
            title="Próximas citas de hoy"
            className="lg:col-span-2"
            flush
            actions={<Link to="/citas" className="text-[13px] font-medium text-brand-dark hover:underline">Ver agenda</Link>}
          >
            {a.upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays}>No hay más citas para hoy.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {a.upcoming.map((apt) => (
                  <li key={apt.id}>
                    <Link to="/citas" className="flex items-center gap-4 px-5 py-3 transition hover:bg-stone-50">
                      <span className="tabular w-[4.75rem] shrink-0 whitespace-nowrap text-sm font-semibold text-ink">
                        {new Date(apt.starts_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {apt.pet?.name ?? apt.contact.pet_name}
                          <span className="font-normal text-muted"> · {apt.reason}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {apt.client?.name ?? apt.contact.name} · {apt.veterinarian?.name}
                        </span>
                      </span>
                      <Badge status={APPOINTMENT_STATUS[apt.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <div className="space-y-6">
          {actions.length > 0 && (
            <Card title="Accesos rápidos">
              <div className="grid gap-2">
                {actions.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm font-medium transition hover:border-brand/40 hover:bg-brand-light/50"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition group-hover:bg-white group-hover:text-brand">
                      <Icon className="size-4" />
                    </span>
                    {label}
                    <ArrowRight className="ml-auto size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {inv && inventoryAlerts > 0 && (
            <Link
              to="/inventario?filter=low_stock"
              className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm transition hover:bg-rose-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><TriangleAlert className="size-4" /></span>
              <span>
                <span className="block font-medium text-rose-900">Inventario requiere atención</span>
                <span className="text-rose-800/80">{inv.low_stock} producto(s) con stock bajo y {inv.expiring} por vencer o vencidos.</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
