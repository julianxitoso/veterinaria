import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { getSchedules, saveAppointmentSettings, saveSchedule } from '../../services/appointmentsService'
import { useTenantStore } from '../../store/tenantStore'
import { fillTemplate } from '../../utils/whatsapp'
import { WEEK_ORDER, WEEKDAYS } from './appointmentLabels'
import { MESSAGE_KINDS, MESSAGE_VARIABLES } from './appointmentMessages'

/**
 * Horario semanal de cada veterinario y configuración de la agenda en línea.
 */
export default function SchedulesPage() {
  const queryClient = useQueryClient()
  const canEdit = useCan('configuracion.editar')
  const { data, isPending } = useQuery({ queryKey: ['schedules'], queryFn: getSchedules })

  const onSaved = (fresh) => {
    queryClient.setQueryData(['schedules'], fresh)
    queryClient.invalidateQueries({ queryKey: ['agenda-day'] })
  }

  if (isPending) return <Spinner />

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Horarios y agenda en línea" subtitle="Cuándo atiende cada veterinario y cómo reservan los clientes" back="/citas" />

      <OnlineBookingCard settings={data.settings} canEdit={canEdit} onSaved={() => queryClient.invalidateQueries({ queryKey: ['schedules'] })} />

      <WhatsAppMessagesCard
        settings={data.settings}
        canEdit={canEdit}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['schedules'] })
          queryClient.invalidateQueries({ queryKey: ['agenda-day'] })
        }}
      />

      {data.data.length === 0 && (
        <Card><p className="text-sm text-muted">No hay usuarios con rol veterinario o administrador.</p></Card>
      )}

      {data.data.map((vet) => (
        <VetScheduleCard key={vet.id} vet={vet} canEdit={canEdit} onSaved={onSaved} />
      ))}
    </div>
  )
}

function VetScheduleCard({ vet, canEdit, onSaved }) {
  const [blocks, setBlocks] = useState(vet.blocks)
  const dirty = JSON.stringify(blocks) !== JSON.stringify(vet.blocks)

  const mutation = useMutation({
    mutationFn: () => saveSchedule(vet.id, blocks),
    onSuccess: (fresh) => {
      onSaved(fresh)
      // el servidor devuelve los bloques ordenados
      setBlocks(fresh.data.find((v) => v.id === vet.id)?.blocks ?? [])
    },
  })
  const error = Object.values(mutation.error?.response?.data?.errors ?? {})[0]?.[0]

  const update = (index, field, value) => setBlocks((b) => b.map((block, i) => (i === index ? { ...block, [field]: value } : block)))
  const remove = (index) => setBlocks((b) => b.filter((_, i) => i !== index))
  const add = (weekday) => {
    const last = blocks.filter((b) => b.weekday === weekday).at(-1)
    setBlocks((b) => [...b, last ? { weekday, start_time: last.end_time, end_time: last.end_time } : { weekday, start_time: '08:00', end_time: '12:00' }])
  }
  // copia el horario del lunes a martes-viernes
  const copyMonday = () =>
    setBlocks((b) => [
      ...b.filter((x) => ![2, 3, 4, 5].includes(x.weekday)),
      ...[2, 3, 4, 5].flatMap((d) => b.filter((x) => x.weekday === 1).map((x) => ({ ...x, weekday: d }))),
    ])

  const totalHours = blocks.reduce((sum, b) => {
    const [sh, sm] = b.start_time.split(':').map(Number)
    const [eh, em] = b.end_time.split(':').map(Number)
    return sum + Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60
  }, 0)

  return (
    <Card
      title={vet.name}
      actions={<span className="text-xs text-muted">{totalHours.toFixed(0)} h/semana</span>}
    >
      <div className="divide-y divide-line">
        {WEEK_ORDER.map((weekday) => {
          const dayBlocks = blocks.map((b, i) => ({ ...b, i })).filter((b) => b.weekday === weekday)
          return (
            <div key={weekday} className="flex flex-wrap items-center gap-3 py-2">
              <span className={`w-24 text-sm ${dayBlocks.length ? 'font-medium' : 'text-stone-400'}`}>{WEEKDAYS[weekday]}</span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {dayBlocks.length === 0 && <span className="text-xs text-stone-400">No atiende</span>}
                {dayBlocks.map((b) => (
                  <span key={b.i} className="inline-flex items-center gap-1 rounded-lg border border-line bg-stone-50 px-2 py-1">
                    <input type="time" step={900} disabled={!canEdit} value={b.start_time} onChange={(e) => update(b.i, 'start_time', e.target.value)} className="bg-transparent text-sm outline-none" />
                    <span className="text-stone-400">–</span>
                    <input type="time" step={900} disabled={!canEdit} value={b.end_time} onChange={(e) => update(b.i, 'end_time', e.target.value)} className="bg-transparent text-sm outline-none" />
                    {canEdit && <button type="button" onClick={() => remove(b.i)} className="ml-1 rounded p-0.5 text-stone-400 hover:text-red-600" aria-label="Quitar"><X className="size-3.5" /></button>}
                  </span>
                ))}
                {canEdit && (
                  <button type="button" onClick={() => add(weekday)} className="text-xs font-medium text-brand-dark hover:underline">+ bloque</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          {mutation.isSuccess && !dirty && <span className="text-sm text-emerald-700">Guardado ✓</span>}
          <Button variant="ghost" onClick={copyMonday} disabled={!blocks.some((b) => b.weekday === 1)}>Copiar lunes a martes–viernes</Button>
          <Button disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>Guardar horario</Button>
        </div>
      )}
    </Card>
  )
}

const BOOKING_FIELDS = ['slot_minutes', 'online_enabled', 'min_notice_hours', 'max_days_ahead']

function OnlineBookingCard({ settings, canEdit, onSaved }) {
  // solo sus campos: las plantillas de WhatsApp se guardan en su propia tarjeta
  const pick = (s) => Object.fromEntries(BOOKING_FIELDS.map((k) => [k, s[k]]))
  const [values, setValues] = useState(() => pick(settings))
  const [copied, setCopied] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(pick(settings))
  const link = `${window.location.origin}/agendar`

  const mutation = useMutation({ mutationFn: () => saveAppointmentSettings(values), onSuccess: onSaved })
  const set = (f, numeric = true) => (e) =>
    setValues((v) => ({ ...v, [f]: e.target.type === 'checkbox' ? e.target.checked : numeric ? Number(e.target.value) : e.target.value }))

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card title="Agenda en línea para clientes">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-3 text-sm">
        <span className="text-muted">Enlace para compartir:</span>
        <a href={link} target="_blank" rel="noreferrer" className="font-medium text-brand-dark hover:underline">{link}</a>
        <Button variant="secondary" className="ml-auto py-1" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
      </div>

      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Checkbox label="Permitir que los clientes soliciten citas en línea" checked={values.online_enabled} onChange={set('online_enabled')} />
        </div>
        <Field label="Duración de cada cita">
          <Select value={values.slot_minutes} onChange={set('slot_minutes')}>
            {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutos</option>)}
          </Select>
        </Field>
        <Field label="Anticipación mínima (horas)">
          <Input type="number" min={0} max={168} value={values.min_notice_hours} onChange={set('min_notice_hours')} />
        </Field>
        <Field label="Reservar hasta (días adelante)">
          <Input type="number" min={1} max={180} value={values.max_days_ahead} onChange={set('max_days_ahead')} />
        </Field>
      </fieldset>
      <p className="mt-3 text-xs text-muted">Las solicitudes en línea llegan como "Solicitada" y aparecen arriba en la agenda para confirmarlas.</p>

      {canEdit && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {mutation.isSuccess && !dirty && <span className="text-sm text-emerald-700">Guardado ✓</span>}
          <Button disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>Guardar</Button>
        </div>
      )}
    </Card>
  )
}

const SAMPLE_VALUES = {
  cliente: 'Laura',
  mascota: 'Toby',
  fecha: 'viernes 23 de octubre',
  hora: '9:30 a. m.',
  veterinario: 'Dra. Ana Pérez',
}

/**
 * Plantillas de los mensajes que se envían al cliente por WhatsApp.
 */
function WhatsAppMessagesCard({ settings, canEdit, onSaved }) {
  const tenant = useTenantStore((s) => s.tenant)
  const [kind, setKind] = useState('confirmed')
  const [messages, setMessages] = useState(settings.messages)
  const dirty = JSON.stringify(messages) !== JSON.stringify(settings.messages)

  const mutation = useMutation({ mutationFn: () => saveAppointmentSettings({ ...settings, messages }), onSuccess: onSaved })

  const insert = (variable) => setMessages((m) => ({ ...m, [kind]: `${m[kind]}{${variable}}` }))
  const preview = fillTemplate(messages[kind] ?? '', { ...SAMPLE_VALUES, clinica: tenant.name, direccion: 'Calle 5 # 10-20', telefono: '602 820 0000' })

  return (
    <Card title="Mensajes de WhatsApp para el cliente">
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1">
        {Object.entries(MESSAGE_KINDS).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${kind === k ? 'bg-white shadow-sm' : 'text-muted hover:text-stone-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Textarea
            rows={7}
            disabled={!canEdit}
            value={messages[kind] ?? ''}
            onChange={(e) => setMessages((m) => ({ ...m, [kind]: e.target.value }))}
          />
          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(MESSAGE_VARIABLES).map(([v, help]) => (
                <button
                  key={v}
                  type="button"
                  title={help}
                  onClick={() => insert(v)}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-brand-light hover:text-brand-dark"
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-stone-400">Usa *texto* para negrita en WhatsApp. Si dejas el mensaje vacío se usa el de por defecto.</p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted">Vista previa</p>
          <div className="rounded-xl bg-[#e5ddd5] p-3">
            <div className="ml-auto max-w-[90%] whitespace-pre-line rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-sm shadow-sm">
              {preview}
            </div>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {mutation.isSuccess && !dirty && <span className="text-sm text-emerald-700">Guardado ✓</span>}
          <Button variant="secondary" disabled={!dirty} onClick={() => setMessages(settings.messages)}>Descartar</Button>
          <Button disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>Guardar mensajes</Button>
        </div>
      )}
    </Card>
  )
}
