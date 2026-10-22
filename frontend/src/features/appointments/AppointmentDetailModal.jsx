import { useMutation } from '@tanstack/react-query'
import { Check, CircleCheck, Clock, Globe, PawPrint, Phone, StickyNote, Stethoscope, TriangleAlert, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Form'
import Modal from '../../components/ui/Modal'
import { useCan } from '../../hooks/useCan'
import { changeAppointmentStatus } from '../../services/appointmentsService'
import { formatDateTime } from '../../utils/format'
import { APPOINTMENT_STATUS } from './appointmentLabels'
import WhatsAppButton from './WhatsAppButton'

/**
 * Detalle de una cita con las acciones que permite su estado. Tras confirmar
 * o cancelar se queda abierta para avisar al cliente por WhatsApp.
 */
export default function AppointmentDetailModal({ appointment, settings, clinic, notice = null, onClose, onRefresh, onReschedule }) {
  const navigate = useNavigate()
  const canEdit = useCan('citas.editar')
  const canAttend = useCan('consultas.crear')
  const [a, setA] = useState(appointment)
  // 'confirmed' | 'cancelled': muestra el recuadro para avisar al cliente
  const [justChanged, setJustChanged] = useState(notice)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const status = useMutation({
    mutationFn: ({ next, why }) => changeAppointmentStatus(a.id, next, why),
    onSuccess: (updated) => {
      setA(updated)
      setJustChanged(updated.status)
      setCancelling(false)
      onRefresh()
    },
  })

  const error = status.error?.response?.data?.errors?.status?.[0]
  const isOnlineGuest = a.source === 'online' && !a.pet
  const petName = a.pet?.name ?? a.contact.pet_name
  const ownerName = a.client?.name ?? a.contact.name
  const phone = a.client?.phone ?? a.contact.phone
  const whatsApp = { appointment: a, settings, clinic }

  const startConsultation = () => {
    const params = new URLSearchParams({ mascota: a.pet_id, cita: a.id, motivo: a.reason })
    navigate(`/consultas/nueva?${params}`)
  }

  return (
    <Modal title="Cita" onClose={onClose}>
      <div className="space-y-3 text-sm">
        {/* tras confirmar o cancelar: avisar al cliente */}
        {justChanged === 'confirmed' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="flex items-center gap-2 font-semibold text-emerald-900">
              <CircleCheck className="size-4 text-emerald-600" /> Cita agendada y confirmada. Avísale al cliente:
            </p>
            <div className="mt-2"><WhatsAppButton {...whatsApp} kind="confirmed" primary>Enviar confirmación por WhatsApp</WhatsAppButton></div>
          </div>
        )}
        {justChanged === 'cancelled' && (
          <div className="rounded-xl border border-line bg-stone-50 p-3">
            <p className="font-semibold">Cita cancelada. ¿Quieres avisarle al cliente?</p>
            <div className="mt-2"><WhatsAppButton {...whatsApp} kind="cancelled" primary>Avisar cancelación por WhatsApp</WhatsAppButton></div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge status={APPOINTMENT_STATUS[a.status]} />
          {a.source === 'online' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11.5px] font-medium text-violet-700">
              <Globe className="size-3" /> Agendada en línea
            </span>
          )}
        </div>

        <div>
          <p className="text-base font-semibold">{a.reason}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-stone-600">
            <Clock className="size-3.5 text-stone-400" />
            {formatDateTime(a.starts_at)} · {a.duration} min · {a.veterinarian?.name}
          </p>
        </div>

        <div className="space-y-1.5 rounded-xl bg-stone-50 p-3">
          <p className="flex items-center gap-2">
            <PawPrint className="size-4 text-stone-400" />
            {a.pet ? (
              <Link to={`/pacientes/${a.pet.id}`} className="font-medium text-ink hover:text-brand-dark">{a.pet.name}</Link>
            ) : (
              <span className="font-medium">{petName}</span>
            )}
            <span className="text-muted">· {a.pet?.species ?? a.contact.pet_species}</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <UserRound className="size-4 text-stone-400" />
            {a.client ? <Link to={`/clientes/${a.client.id}`} className="hover:text-brand-dark">{ownerName}</Link> : ownerName}
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-muted hover:text-ink">
                <Phone className="size-3.5" /> {phone}
              </a>
            )}
          </p>
          {isOnlineGuest && <p className="pt-1 text-xs text-amber-700">Cliente o mascota nuevos: se registrarán al confirmar la cita.</p>}
          {a.pet?.allergies && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-rose-700">
              <TriangleAlert className="size-3.5" /> Alergias: {a.pet.allergies}
            </p>
          )}
        </div>

        {a.notes && (
          <p className="flex gap-2 whitespace-pre-line text-stone-600">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-stone-400" /> {a.notes}
          </p>
        )}
        {a.cancel_reason && <p className="text-muted">Motivo de cancelación: {a.cancel_reason}</p>}
        {a.created_by && <p className="text-xs text-stone-400">Agendada por {a.created_by.name}</p>}

        {/* avisos en cualquier momento (sin el recuadro de recién cambiada) */}
        {!justChanged && a.status === 'confirmed' && (
          <div className="flex flex-wrap gap-2">
            <WhatsAppButton {...whatsApp} kind="confirmed">Confirmación</WhatsAppButton>
            <WhatsAppButton {...whatsApp} kind="reminder">Recordatorio</WhatsAppButton>
          </div>
        )}
        {!justChanged && a.status === 'cancelled' && (
          <WhatsAppButton {...whatsApp} kind="cancelled">Avisar cancelación</WhatsAppButton>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}

        {cancelling ? (
          <div className="space-y-2 border-t border-line pt-3">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la cancelación (opcional)" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelling(false)}>Volver</Button>
              <Button variant="danger" onClick={() => status.mutate({ next: 'cancelled', why: reason || null })} disabled={status.isPending}>
                Cancelar cita
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
            {a.status === 'attended' && a.consultation_id && (
              <Button variant="secondary" icon={Stethoscope} to={`/consultas/${a.consultation_id}`}>Ver consulta</Button>
            )}
            {canEdit && ['requested', 'confirmed'].includes(a.status) && (
              <>
                <Button variant="ghost" className="text-red-600" onClick={() => setCancelling(true)}>Cancelar</Button>
                <Button variant="secondary" onClick={() => onReschedule(a)}>Reprogramar</Button>
              </>
            )}
            {canEdit && a.status === 'confirmed' && (
              <Button variant="secondary" onClick={() => status.mutate({ next: 'no_show' })} disabled={status.isPending}>No asistió</Button>
            )}
            {canEdit && a.status === 'no_show' && (
              <Button variant="secondary" onClick={() => status.mutate({ next: 'confirmed' })}>Volver a confirmar</Button>
            )}
            {canEdit && a.status === 'requested' && (
              <Button icon={Check} onClick={() => status.mutate({ next: 'confirmed' })} disabled={status.isPending}>Confirmar</Button>
            )}
            {canAttend && a.status === 'confirmed' && a.pet_id && (
              <Button icon={Stethoscope} onClick={startConsultation}>Iniciar consulta</Button>
            )}
            {justChanged && <Button variant="secondary" onClick={onClose}>Listo</Button>}
          </div>
        )}
      </div>
    </Modal>
  )
}
