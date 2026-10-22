import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, Globe, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { Card, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { useNow } from '../../hooks/useNow'
import { getAgendaDay, listAppointments } from '../../services/appointmentsService'
import { formatDateTime, todayISO } from '../../utils/format'
import AppointmentDetailModal from './AppointmentDetailModal'
import AppointmentFormModal from './AppointmentFormModal'
import { addDays, APPOINTMENT_STATUS, formatLongDate, minutesOf, minutesOfDate, timeOf } from './appointmentLabels'

const PX_PER_MIN = 1.6 // 30 min ≈ 48 px

export default function AgendaPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const date = params.get('fecha') ?? todayISO()
  const vetFilter = params.get('vet') ?? ''
  const canCreate = useCan('citas.crear')
  const canConfigure = useCan('configuracion.editar')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const now = useNow()

  const setDate = (d) => setParams({ ...(vetFilter && { vet: vetFilter }), ...(d !== todayISO() && { fecha: d }) }, { replace: true })

  const { data: day, isPending: dayPending } = useQuery({ queryKey: ['agenda-day', date], queryFn: () => getAgendaDay(date) })
  const { data: appointments, isPending } = useQuery({
    queryKey: ['appointments', { from: date, to: date }],
    queryFn: () => listAppointments({ from: date, to: date }),
  })
  const { data: requests } = useQuery({
    queryKey: ['appointments', { status: 'requested' }],
    queryFn: () => listAppointments({ status: 'requested' }),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['agenda-day'] })
    queryClient.invalidateQueries({ queryKey: ['clinical-summary'] })
  }

  if (dayPending || isPending) return <Spinner />

  const slot = day.settings.slot_minutes

  // columnas: veterinarios con horario + quien tenga citas ese día sin horario
  const vets = [...day.vets]
  appointments.forEach((a) => {
    if (a.veterinarian && !vets.some((v) => v.id === a.user_id)) vets.push(a.veterinarian)
  })
  const columns = vetFilter ? vets.filter((v) => String(v.id) === vetFilter) : vets

  // rango visible: horarios y citas del día, en bloques completos
  const starts = [...day.schedules.map((s) => minutesOf(s.start_time)), ...appointments.map((a) => minutesOfDate(a.starts_at))]
  const ends = [...day.schedules.map((s) => minutesOf(s.end_time)), ...appointments.map((a) => minutesOfDate(a.ends_at))]
  const dayStart = Math.floor((starts.length ? Math.min(...starts) : 8 * 60) / 60) * 60
  const dayEnd = Math.ceil((ends.length ? Math.max(...ends) : 18 * 60) / 60) * 60
  const rows = []
  for (let m = dayStart; m < dayEnd; m += slot) rows.push(m)

  const isToday = date === todayISO()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const worksAt = (vetId, minute) =>
    day.schedules.some((s) => s.user_id === vetId && minute >= minutesOf(s.start_time) && minute < minutesOf(s.end_time))

  const openNew = (vetId, minute) =>
    setForm({ initial: { user_id: vetId, date, time: timeOf(minute) } })

  const activeCount = appointments.filter((a) => ['requested', 'confirmed'].includes(a.status)).length

  return (
    <div>
      <PageHeader
        title="Citas"
        subtitle={`${formatLongDate(date)} · ${activeCount} cita(s) pendiente(s)`}
        actions={
          <>
            <Button variant="secondary" icon={Clock} to="/citas/horarios">Horarios{canConfigure ? ' y agenda en línea' : ''}</Button>
            {canCreate && <Button icon={Plus} onClick={() => setForm({ initial: { date, time: timeOf(dayStart) } })}>Nueva cita</Button>}
          </>
        }
      />

      {requests?.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <span className="flex size-6 items-center justify-center rounded-md bg-amber-100 text-amber-600"><Globe className="size-3.5" /></span>
            {requests.length} solicitud(es) en línea por confirmar
          </p>
          <ul className="space-y-0.5 text-sm">
            {requests.map((r) => (
              <li key={r.id}>
                <button type="button" className="w-full rounded-lg px-2 py-1 text-left text-amber-900 transition hover:bg-amber-100/60" onClick={() => setSelected(r)}>
                  <span className="tabular font-medium">{formatDateTime(r.starts_at)}</span>
                  <span className="text-amber-800/80"> · {r.pet?.name ?? r.contact.pet_name} ({r.client?.name ?? r.contact.name}) · {r.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-line-strong bg-white">
          <button type="button" className="flex size-9 items-center justify-center rounded-l-lg text-stone-500 hover:bg-stone-50" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className={`h-9 border-x border-line px-3 text-sm font-medium ${isToday ? 'text-brand-dark' : 'text-stone-700 hover:bg-stone-50'}`}
            onClick={() => setDate(todayISO())}
          >
            Hoy
          </button>
          <button type="button" className="flex size-9 items-center justify-center rounded-r-lg text-stone-500 hover:bg-stone-50" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" />
        <Select
          value={vetFilter}
          onChange={(e) => setParams({ ...(e.target.value && { vet: e.target.value }), ...(date !== todayISO() && { fecha: date }) }, { replace: true })}
          className="w-auto"
        >
          <option value="">Todos los veterinarios</option>
          {vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </div>

      {columns.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Nadie tiene horario de atención este día.{' '}
            {canConfigure && <Link to="/citas/horarios" className="text-brand-dark hover:underline">Configurar horarios</Link>}
          </p>
        </Card>
      ) : (
        <Card flush>
          <div className="overflow-x-auto">
            {/* el ancho mínimo de cada columna activa el desplazamiento horizontal en celular */}
            <div className="flex">
              {/* columna de horas */}
              <div className="w-16 shrink-0 border-r border-line">
                <div className="h-10 border-b border-line" />
                {rows.map((m) => (
                  <div key={m} className="pr-2 text-right text-xs text-stone-400" style={{ height: slot * PX_PER_MIN }}>
                    {m % 60 === 0 || slot < 60 ? timeOf(m) : ''}
                  </div>
                ))}
              </div>

              {columns.map((vet) => (
                <div key={vet.id} className="min-w-[150px] flex-1 border-r border-line last:border-r-0 sm:min-w-[190px]">
                  <div className="flex h-10 items-center justify-center border-b border-line px-2 text-sm font-semibold">
                    <span className="truncate">{vet.name}</span>
                  </div>
                  <div className="relative" style={{ height: (dayEnd - dayStart) * PX_PER_MIN }}>
                    {rows.map((m) => {
                      const working = worksAt(vet.id, m)
                      const past = isToday && m + slot <= nowMinutes
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={!canCreate || !working || past}
                          onClick={() => openNew(vet.id, m)}
                          title={working && !past ? `Agendar ${timeOf(m)}` : undefined}
                          className={`absolute inset-x-0 border-b border-line transition ${
                            working ? 'bg-white hover:bg-brand-light/60 disabled:hover:bg-white' : 'bg-stone-100/70 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.15)_6px,rgba(148,163,184,0.15)_12px)]'
                          }`}
                          style={{ top: (m - dayStart) * PX_PER_MIN, height: slot * PX_PER_MIN }}
                        />
                      )
                    })}

                    {appointments
                      .filter((a) => a.user_id === vet.id)
                      .map((a) => {
                        const top = (minutesOfDate(a.starts_at) - dayStart) * PX_PER_MIN
                        const height = Math.max(a.duration * PX_PER_MIN - 2, 22)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelected(a)}
                            className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md ${APPOINTMENT_STATUS[a.status].card}`}
                            style={{ top: top + 1, height }}
                          >
                            <p className="truncate font-semibold">
                              <span className="tabular">{timeOf(minutesOfDate(a.starts_at))}</span>{' '}
                              {a.source === 'online' && <Globe className="inline size-3 align-[-1px]" />} {a.pet?.name ?? a.contact.pet_name}
                            </p>
                            {height > 30 && <p className="truncate opacity-80">{a.reason}</p>}
                          </button>
                        )
                      })}

                    {isToday && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: (nowMinutes - dayStart) * PX_PER_MIN }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(APPOINTMENT_STATUS).map(([k, s]) => (
          <span key={k} className="inline-flex items-center gap-1"><span className={`h-3 w-3 rounded border-l-4 ${s.card}`} />{s.label}</span>
        ))}
        <span>· Zona rayada: fuera del horario de atención</span>
      </div>

      {selected && (
        <AppointmentDetailModal
          key={selected.id}
          appointment={selected}
          notice={selected.notice}
          settings={day.settings}
          clinic={day.clinic}
          onClose={() => setSelected(null)}
          onRefresh={refresh}
          onReschedule={(a) => {
            setSelected(null)
            setForm({
              initial: {
                id: a.id, pet: a.pet, user_id: a.user_id, date: a.starts_at.slice(0, 10),
                time: timeOf(minutesOfDate(a.starts_at)), duration: a.duration, reason: a.reason, notes: a.notes,
              },
            })
          }}
        />
      )}

      {form && (
        <AppointmentFormModal
          initial={form.initial}
          slotMinutes={slot}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setForm(null)
            refresh()
            // recién creada o reprogramada: ofrecer avisar al cliente
            if (saved.status === 'confirmed') setSelected({ ...saved, notice: 'confirmed' })
          }}
        />
      )}
    </div>
  )
}
