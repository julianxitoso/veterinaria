import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CircleCheck,
  FileText,
  FlaskConical,
  HeartPulse,
  Pencil,
  Pill,
  Plus,
  Receipt,
  ShoppingBag,
  Thermometer,
  TriangleAlert,
  UserRound,
  Weight,
  Wind,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Select, Textarea } from '../../components/ui/Form'
import { Card, DetailList, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { invoiceFromConsultation } from '../../services/billingService'
import { closeConsultation, getConsultation, updateExam } from '../../services/consultationsService'
import { formatDate, formatDateTime, formatMoney, formatQty } from '../../utils/format'
import { openPdf } from '../../utils/pdf'
import { PAYMENT_STATUS } from '../billing/billingLabels'
import AttachmentsPanel from '../history/AttachmentsPanel'
import RecordForm from '../history/RecordForm'
import PetAvatar from '../pets/PetAvatar'
import { CONSULTATION_STATUS, EXAM_STATUS, RECORD_TYPES, WITH_NEXT_DATE } from './consultationLabels'

export default function ConsultationDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [showEvolutionForm, setShowEvolutionForm] = useState(false)
  const canEdit = useCan('consultas.editar')
  const canCreate = useCan('consultas.crear')
  const canInvoice = useCan('facturas.crear')
  const canSeeInvoices = useCan('facturas.ver')
  const navigate = useNavigate()

  const queryKey = ['consultation', id]
  const { data: c, isPending, error } = useQuery({ queryKey, queryFn: () => getConsultation(id) })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['consultations'] })
    if (c) {
      queryClient.invalidateQueries({ queryKey: ['history', String(c.pet_id)] })
      queryClient.invalidateQueries({ queryKey: ['clinical-summary', String(c.pet_id)] })
    }
  }

  const close = useMutation({
    mutationFn: () => closeConsultation(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      refresh()
    },
    onError: (err) => alert(err.response?.data?.message ?? 'No se pudo finalizar la consulta.'),
  })

  // arma (o retoma) el borrador con la consulta y los productos que lleva
  const invoice = useMutation({
    mutationFn: () => invoiceFromConsultation(id),
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/facturas/${draft.id}/editar`)
    },
    onError: (err) => alert(Object.values(err.response?.data?.errors ?? {})[0]?.[0] ?? 'No se pudo crear la factura.'),
  })

  if (isPending) return <Spinner />
  if (error) return <ErrorState error={error} />

  const isOpen = c.status === 'open'
  const evolutions = c.records.filter((r) => r.type === 'evolution')
  const applied = c.records.filter((r) => WITH_NEXT_DATE.includes(r.type))

  const handleClose = () => {
    if (confirm('¿Finalizar la consulta? Después solo podrás agregar notas de evolución y resultados de exámenes.')) {
      close.mutate()
    }
  }

  return (
    <div>
      <PageHeader
        title={c.reason}
        subtitle={`${formatDateTime(c.consulted_at)} · ${c.veterinarian?.name ?? ''}`}
        back={`/pacientes/${c.pet_id}`}
        actions={
          <>
            <Badge status={CONSULTATION_STATUS[c.status]} />
            {isOpen && canEdit && (
              <>
                <Button variant="secondary" icon={Pencil} to={`/consultas/${id}/editar`}>Continuar</Button>
                <Button variant={canInvoice ? 'secondary' : 'primary'} icon={CircleCheck} onClick={handleClose} disabled={close.isPending}>Finalizar consulta</Button>
              </>
            )}
            {canInvoice && (!c.invoice || c.invoice.status === 'draft') && (
              <Button icon={Receipt} onClick={() => invoice.mutate()} disabled={invoice.isPending}>
                {c.invoice ? 'Continuar factura' : 'Facturar'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Anamnesis y examen físico">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Vital icon={Weight} label="Peso" value={c.weight} unit="kg" />
              <Vital icon={Thermometer} label="Temperatura" value={c.temperature} unit="°C" />
              <Vital icon={HeartPulse} label="Frec. cardiaca" value={c.heart_rate} unit="lpm" />
              <Vital icon={Wind} label="Frec. respiratoria" value={c.respiratory_rate} unit="rpm" />
            </div>
            <DetailList items={[['Anamnesis / síntomas', c.anamnesis], ['Examen físico', c.physical_exam]]} />
          </Card>

          <Card title="Diagnóstico y tratamiento">
            <DetailList
              items={[
                ['Diagnóstico', c.diagnosis],
                ['Tratamiento', c.treatment],
                ['Indicaciones', c.instructions],
                ['Observaciones médicas', c.observations],
              ]}
            />
          </Card>

          <Card title={`Medicamentos indicados (${c.medications.length})`}>
            {c.medications.length === 0 ? (
              <p className="text-sm text-muted">Sin medicamentos.</p>
            ) : (
              <ul className="divide-y divide-line">
                {c.medications.map((m) => (
                  <li key={m.id} className="py-2 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <Pill className="size-4 text-stone-400" />
                      {m.name} {m.dose && <span className="font-normal text-stone-600">— {m.dose}</span>}
                      {m.dispense && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                          <ShoppingBag className="size-3" /> Lo lleva: {formatQty(m.quantity)} {m.product?.unit}
                        </span>
                      )}
                    </p>
                    <p className="text-muted">
                      {[m.frequency, m.duration, m.route].filter(Boolean).join(' · ')}
                      {m.notes && ` · ${m.notes}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Exámenes solicitados (${c.exams.length})`}>
            {c.exams.length === 0 ? (
              <p className="text-sm text-muted">Sin exámenes.</p>
            ) : (
              <ul className="space-y-3">
                {c.exams.map((exam) => (
                  <ExamItem key={exam.id} consultationId={c.id} exam={exam} canEdit={canEdit} onSaved={(data) => queryClient.setQueryData(queryKey, data)} />
                ))}
              </ul>
            )}
          </Card>

          {applied.length > 0 && (
            <Card title="Vacunas / desparasitación aplicadas">
              <ul className="space-y-1 text-sm">
                {applied.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <AppliedIcon type={r.type} />
                    <span className="font-medium">{r.title}</span>
                    {r.next_date && <span className="text-muted"> · próxima dosis {formatDate(r.next_date)}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title="Evolución"
            actions={
              canCreate && !showEvolutionForm && (
                <Button variant="soft" size="sm" icon={Plus} onClick={() => setShowEvolutionForm(true)}>Nota de evolución</Button>
              )
            }
          >
            {showEvolutionForm && (
              <div className="mb-4">
                <RecordForm
                  petId={c.pet_id}
                  type="evolution"
                  consultationId={c.id}
                  onSaved={() => {
                    setShowEvolutionForm(false)
                    refresh()
                  }}
                  onCancel={() => setShowEvolutionForm(false)}
                />
              </div>
            )}
            {evolutions.length === 0 ? (
              !showEvolutionForm && <p className="text-sm text-muted">Sin notas de evolución.</p>
            ) : (
              <ul className="space-y-3">
                {evolutions.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                    <p className="text-xs text-muted">{formatDateTime(r.recorded_at)} · {r.author?.name}</p>
                    {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                    <p className="mt-1 whitespace-pre-line">{r.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Paciente">
            <Link to={`/pacientes/${c.pet.id}`} className="flex items-center gap-3 rounded-xl transition hover:opacity-80">
              <PetAvatar pet={c.pet} />
              <span>
                <span className="block font-medium text-ink">{c.pet.name}</span>
                <span className="text-[13px] text-muted">{[c.pet.species, c.pet.breed, c.pet.age].filter(Boolean).join(' · ')}</span>
              </span>
            </Link>
            <p className="mt-3 flex items-center gap-1.5 text-[13px]">
              <UserRound className="size-3.5 text-stone-400" />
              <Link to={`/clientes/${c.pet.client.id}`} className="hover:underline">{c.pet.client.name}</Link>
              {c.pet.client.phone && <span className="text-muted"> · {c.pet.client.phone}</span>}
            </p>
            {c.pet.allergies && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-2 text-[13px] text-rose-900">
                <TriangleAlert className="size-4 shrink-0 text-rose-500" /> {c.pet.allergies}
              </p>
            )}
          </Card>

          <Card title="Documentos">
            <div className="flex flex-col gap-2">
              <Button variant="secondary" icon={FileText} className="justify-start" onClick={() => openPdf(`/consultations/${c.id}/prescription.pdf`)}>
                Fórmula médica / receta
              </Button>
              {c.exams.length > 0 && (
                <Button variant="secondary" icon={FlaskConical} className="justify-start" onClick={() => openPdf(`/consultations/${c.id}/exam-order.pdf`)}>
                  Orden de exámenes
                </Button>
              )}
            </div>
            {c.invoice && canSeeInvoices && (
              <Link to={`/facturas/${c.invoice.id}`} className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm transition hover:bg-stone-100">
                <span className="inline-flex items-center gap-2"><Receipt className="size-4 text-stone-400" /> {c.invoice.number ?? 'Factura en borrador'}</span>
                <span className="flex items-center gap-2">
                  {formatMoney(c.invoice.total)}
                  {c.invoice.payment_status && <Badge status={PAYMENT_STATUS[c.invoice.payment_status]} />}
                </span>
              </Link>
            )}
          </Card>

          {c.follow_up_date && (
            <Card title="Control">
              <p className="flex items-center gap-2 text-sm"><CalendarClock className="size-4 text-stone-400" /> {formatDate(c.follow_up_date)}</p>
            </Card>
          )}

          <Card title="Adjuntos">
            <AttachmentsPanel type="consultation" id={c.id} attachments={c.attachments} onChange={refresh} />
          </Card>

          {c.closed_at && (
            <p className="text-center text-xs text-stone-400">Finalizada el {formatDateTime(c.closed_at)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Vital({ icon: Icon, label, value, unit }) {
  return (
    <div className="rounded-xl border border-line bg-stone-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icon className="size-3.5" /> {label}</p>
      <p className="tabular mt-1 text-lg font-semibold text-ink">
        {value ?? <span className="text-stone-300">—</span>} {value != null && <span className="text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  )
}

function AppliedIcon({ type }) {
  const Icon = RECORD_TYPES[type].Icon
  return (
    <span className="flex size-6 items-center justify-center rounded-md bg-brand-light text-brand">
      <Icon className="size-3.5" />
    </span>
  )
}

/**
 * Examen con registro de resultado (permitido aun con la consulta cerrada).
 */
function ExamItem({ consultationId, exam, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState(exam.result ?? '')
  const [status, setStatus] = useState(exam.status)

  const save = useMutation({
    mutationFn: () => updateExam(consultationId, exam.id, { result: result || null, status }),
    onSuccess: (data) => {
      onSaved(data)
      setEditing(false)
    },
    onError: () => alert('No se pudo guardar el resultado.'),
  })

  return (
    <li className="rounded-xl border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium"><FlaskConical className="size-4 text-stone-400" /> {exam.name}</p>
        <div className="flex items-center gap-2">
          <Badge status={EXAM_STATUS[exam.status]} />
          {canEdit && !editing && (
            <button className="text-xs text-brand-dark hover:underline" onClick={() => setEditing(true)}>
              {exam.result ? 'Editar resultado' : 'Registrar resultado'}
            </button>
          )}
        </div>
      </div>
      {exam.notes && <p className="mt-1 text-muted">{exam.notes}</p>}

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea rows={3} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Resultado del examen…" autoFocus />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              {Object.entries(EXAM_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
            </div>
          </div>
        </div>
      ) : (
        exam.result && <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 p-2.5">{exam.result}</p>
      )}
    </li>
  )
}
