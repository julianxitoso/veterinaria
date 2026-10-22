import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, CircleCheck, PawPrint } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { createPublicBooking, getPublicBooking, getPublicSlots } from '../../services/appointmentsService'
import { useTenantStore } from '../../store/tenantStore'
import { formatDateTime, todayISO } from '../../utils/format'
import { addDays } from '../appointments/appointmentLabels'
import { SPECIES } from '../pets/petLabels'

const VISIBLE_DAYS = 14

/**
 * Agenda en línea para dueños de mascotas: sin cuenta ni contraseña.
 */
export default function PublicBookingPage() {
  const tenant = useTenantStore((s) => s.tenant)
  const [vetId, setVetId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [slot, setSlot] = useState(null)
  const [done, setDone] = useState(null)

  const { data: options, isPending } = useQuery({ queryKey: ['public-booking'], queryFn: getPublicBooking })
  const { data: slots, isFetching } = useQuery({
    queryKey: ['public-slots', date, vetId],
    queryFn: () => getPublicSlots(date, vetId),
    enabled: Boolean(options?.enabled),
  })

  const days = Array.from({ length: Math.min(VISIBLE_DAYS, (options?.max_days_ahead ?? VISIBLE_DAYS) + 1) }, (_, i) => addDays(todayISO(), i))

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas px-4 py-10">
      {/* fondo suave con el color de la clínica */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light to-transparent" />
      <div className="relative mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="mx-auto mb-3 h-16 object-contain" />
          ) : (
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/25">
              <PawPrint className="size-7" />
            </div>
          )}
          <h1 className="text-[26px] font-semibold tracking-tight">{tenant.name}</h1>
          <p className="mt-1 text-muted">Agenda la cita de tu mascota en pocos pasos</p>
        </header>

        <div className="animate-pop-in rounded-3xl border border-line bg-white p-5 shadow-pop sm:p-8">
          {isPending ? (
            <p className="py-10 text-center text-muted">Cargando…</p>
          ) : !options.enabled ? (
            <p className="py-10 text-center text-stone-600">
              La agenda en línea no está disponible en este momento.
              {options.clinic.phone && <> Comunícate al <a href={`tel:${options.clinic.phone}`} className="font-medium text-brand-dark">{options.clinic.phone}</a>.</>}
            </p>
          ) : done ? (
            <Confirmation booking={done} phone={options.clinic.phone} onAnother={() => { setDone(null); setSlot(null) }} />
          ) : slot ? (
            <ContactStep
              slot={slot}
              vetId={vetId}
              vetName={options.vets.find((v) => String(v.id) === vetId)?.name}
              onBack={() => setSlot(null)}
              onDone={setDone}
            />
          ) : (
            <div className="space-y-5">
              <Field label="Veterinario">
                <Select value={vetId} onChange={(e) => setVetId(e.target.value)}>
                  <option value="">Cualquiera disponible</option>
                  {options.vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Día</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  {days.map((d) => {
                    const dt = new Date(`${d}T12:00:00`)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDate(d)}
                        className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-sm transition ${
                          date === d ? 'border-brand bg-brand text-white shadow-md shadow-brand/25' : 'border-line bg-white hover:border-brand/50'
                        }`}
                      >
                        <span className="text-xs capitalize opacity-80">{dt.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
                        <span className="text-lg font-semibold">{dt.getDate()}</span>
                        <span className="text-xs capitalize opacity-80">{dt.toLocaleDateString('es-CO', { month: 'short' })}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Horarios disponibles</p>
                {isFetching ? (
                  <p className="py-4 text-sm text-muted">Buscando horarios…</p>
                ) : slots?.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setSlot(s)}
                        className="tabular rounded-xl border border-line py-2.5 text-sm font-medium transition hover:border-brand hover:bg-brand-light hover:text-brand-dark"
                      >
                        {new Date(s.starts_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-stone-50 py-4 text-center text-sm text-muted">No hay horarios libres este día. Prueba con otro.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          ¿Trabajas en la clínica? <Link to="/login" className="text-brand-dark hover:underline">Ingresa aquí</Link>
        </p>
      </div>
    </div>
  )
}

function ContactStep({ slot, vetId, vetName, onBack, onDone }) {
  const [values, setValues] = useState({
    contact_name: '', contact_phone: '', contact_document: '', contact_email: '',
    pet_name: '', pet_species: 'Perro', reason: '', notes: '', website: '',
  })
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () =>
      createPublicBooking({
        ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])),
        website: values.website,
        user_id: vetId ? Number(vetId) : null,
        starts_at: `${slot.starts_at.slice(0, 10)} ${slot.time}`,
      }),
    onSuccess: onDone,
  })

  const errors = mutation.error?.response?.data?.errors ?? {}
  const tooMany = mutation.error?.response?.status === 429
  const canSend = values.contact_name.trim() && values.contact_phone.trim() && values.pet_name.trim() && values.reason.trim()

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-sm text-muted hover:text-brand">← Cambiar horario</button>
      <div className="mb-5 rounded-xl bg-brand-light px-4 py-3">
        <p className="flex items-center gap-2 font-semibold text-brand-dark">
          <CalendarDays className="size-4" /> {formatDateTime(slot.starts_at)}
        </p>
        {vetName && <p className="text-sm text-stone-600">con {vetName}</p>}
      </div>
      {errors.starts_at && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.starts_at[0]}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tu nombre" required error={errors.contact_name?.[0]} className="sm:col-span-2">
          <Input value={values.contact_name} onChange={set('contact_name')} autoComplete="name" autoFocus />
        </Field>
        <Field label="Celular / WhatsApp" required error={errors.contact_phone?.[0]}>
          <Input type="tel" value={values.contact_phone} onChange={set('contact_phone')} autoComplete="tel" />
        </Field>
        <Field label="Cédula" error={errors.contact_document?.[0]}>
          <Input value={values.contact_document} onChange={set('contact_document')} placeholder="Si ya eres cliente, te reconocemos" />
        </Field>
        <Field label="Email" error={errors.contact_email?.[0]} className="sm:col-span-2">
          <Input type="email" value={values.contact_email} onChange={set('contact_email')} autoComplete="email" />
        </Field>
        <Field label="Nombre de tu mascota" required error={errors.pet_name?.[0]}>
          <Input value={values.pet_name} onChange={set('pet_name')} />
        </Field>
        <Field label="Especie" required error={errors.pet_species?.[0]}>
          <Select value={values.pet_species} onChange={set('pet_species')}>
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Motivo de la cita" required error={errors.reason?.[0]} className="sm:col-span-2">
          <Input value={values.reason} onChange={set('reason')} placeholder="Ej. Vacunación, no quiere comer, control…" />
        </Field>
        <Field label="Algo más que debamos saber" className="sm:col-span-2">
          <Textarea rows={2} value={values.notes} onChange={set('notes')} />
        </Field>
        {/* campo trampa para bots: oculto a las personas */}
        <input type="text" name="website" value={values.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>

      <div className="mt-5">
        <FormError message={tooMany ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' : mutation.error && !Object.keys(errors).length ? 'No se pudo enviar la solicitud.' : null} />
      </div>
      <Button className="mt-3 w-full py-3 text-base" onClick={() => mutation.mutate()} disabled={!canSend || mutation.isPending}>
        {mutation.isPending ? 'Enviando…' : 'Solicitar cita'}
      </Button>
      <p className="mt-2 text-center text-xs text-stone-400">La clínica confirmará tu cita. Tus datos solo se usan para atender a tu mascota.</p>
    </div>
  )
}

function Confirmation({ booking, phone, onAnother }) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50">
        <CircleCheck className="size-8" strokeWidth={1.75} />
      </div>
      <h2 className="text-xl font-semibold">¡Solicitud enviada!</h2>
      <p className="mt-2 text-stone-600">
        Cita para <strong>{booking.pet_name}</strong> el <strong>{formatDateTime(booking.starts_at)}</strong> con {booking.veterinarian}.
      </p>
      <p className="mt-2 text-sm text-muted">
        La clínica la confirmará pronto{phone ? <> o puedes llamar al <a href={`tel:${phone}`} className="text-brand-dark">{phone}</a></> : ''}.
      </p>
      <Button variant="secondary" className="mt-6" onClick={onAnother}>Agendar otra cita</Button>
    </div>
  )
}
