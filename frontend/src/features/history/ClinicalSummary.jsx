import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, CalendarDays, Stethoscope, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getClinicalSummary } from '../../services/historyService'
import { formatDate, formatDateTime } from '../../utils/format'
import { RECORD_TYPES } from '../consultations/consultationLabels'

const CHIP_TONES = {
  overdue: 'border-rose-100 bg-rose-50/70 text-rose-800',
  due_soon: 'border-amber-100 bg-amber-50/70 text-amber-800',
  info: 'border-sky-100 bg-sky-50/70 text-sky-800',
  appointment: 'border-violet-100 bg-violet-50/70 text-violet-800',
}

function Chip({ icon: Icon, tone, to, children }) {
  const classes = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${CHIP_TONES[tone]}`
  const content = (
    <>
      <Icon className="size-3.5 opacity-70" />
      {children}
    </>
  )
  return to ? <Link to={to} className={`${classes} transition hover:brightness-95`}>{content}</Link> : <span className={classes}>{content}</span>
}

/**
 * Alertas clínicas de la mascota: alergias, consulta en curso, control
 * pendiente, próxima cita y vacunas / desparasitaciones vencidas o próximas.
 */
export default function ClinicalSummary({ pet, canContinue }) {
  const { data } = useQuery({
    queryKey: ['clinical-summary', String(pet.id)],
    queryFn: () => getClinicalSummary(pet.id),
  })

  const alerts = (data?.immunizations ?? []).filter((i) => i.status !== 'ok')
  const followUp = data?.follow_up
  const open = data?.open_consultation
  const nextAppointment = data?.next_appointment

  if (!pet.allergies && !open && !followUp && !nextAppointment && alerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2.5">
      {pet.allergies && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <TriangleAlert className="size-4" />
          </span>
          <p><span className="font-semibold">Alergias:</span> {pet.allergies}</p>
        </div>
      )}

      {open && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Stethoscope className="size-4" />
            </span>
            <span>
              <span className="font-semibold">Consulta en curso</span>
              <span className="text-amber-800/80"> · {open.reason} · {formatDateTime(open.consulted_at)}</span>
            </span>
          </p>
          <Link
            to={canContinue ? `/consultas/${open.id}/editar` : `/consultas/${open.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-amber-600"
          >
            {canContinue ? 'Continuar' : 'Ver'} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {(followUp || nextAppointment || alerts.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {nextAppointment && (
            <Chip icon={CalendarDays} tone="appointment" to={`/citas?fecha=${nextAppointment.starts_at.slice(0, 10)}`}>
              Cita {nextAppointment.status === 'requested' ? 'solicitada' : 'agendada'}: {formatDateTime(nextAppointment.starts_at)} · {nextAppointment.veterinarian}
            </Chip>
          )}
          {followUp && (
            <Chip icon={CalendarClock} tone={followUp.overdue ? 'overdue' : 'info'} to={`/consultas/${followUp.consultation_id}`}>
              Control {followUp.overdue ? 'vencido' : 'programado'}: {formatDate(followUp.date)}
            </Chip>
          )}
          {alerts.map((i) => (
            <Chip key={`${i.type}-${i.title}`} icon={RECORD_TYPES[i.type].Icon} tone={i.status}>
              {i.title}: {i.status === 'overdue' ? 'vencida desde' : 'próxima'} {formatDate(i.next_date)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
