import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, CalendarClock, FlaskConical, Paperclip, Pill, Stethoscope, Thermometer, Weight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { Checkbox } from '../../components/ui/Form'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { archiveRecord, getPetHistory } from '../../services/historyService'
import { formatDate, formatDateTime } from '../../utils/format'
import { CONSULTATION_STATUS, RECORD_TYPES, TIMELINE_FILTERS } from '../consultations/consultationLabels'

function matchesFilter(entry, filter) {
  if (filter === 'all') return true
  if (filter === 'consultation') return entry.kind === 'consultation'
  return entry.kind === 'record' && TIMELINE_FILTERS[filter].types.includes(entry.item.type)
}

/**
 * Historia clínica de una mascota: consultas y registros en orden cronológico inverso.
 */
export default function ClinicalTimeline({ petId }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [includeArchived, setIncludeArchived] = useState(false)
  const canArchive = useCan('consultas.editar')

  const { data, isPending, error } = useQuery({
    queryKey: ['history', String(petId), { includeArchived }],
    queryFn: () => getPetHistory(petId, { include_archived: includeArchived ? 1 : 0 }),
  })

  const archive = useMutation({
    mutationFn: archiveRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', String(petId)] })
      queryClient.invalidateQueries({ queryKey: ['clinical-summary', String(petId)] })
    },
  })

  const handleArchive = (record) => {
    if (confirm('¿Archivar este registro? Dejará de mostrarse, pero no se elimina.')) archive.mutate(record.id)
  }

  const entries = data?.filter((entry) => matchesFilter(entry, filter)) ?? []

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="border-b border-line px-5 py-3">
        <h2 className="font-semibold">Historia clínica</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(TIMELINE_FILTERS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === key ? 'bg-ink text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-5">
        {isPending ? (
          <Spinner />
        ) : error ? (
          <ErrorState error={error} />
        ) : entries.length === 0 ? (
          <EmptyState>{filter === 'all' ? 'Aún no hay registros en la historia clínica.' : 'No hay registros de este tipo.'}</EmptyState>
        ) : (
          <ol className="relative ml-4 space-y-4 border-l border-line-strong pl-7">
            {entries.map((entry) =>
              entry.kind === 'consultation' ? (
                <ConsultationEntry key={`c-${entry.item.id}`} consultation={entry.item} attachmentsCount={entry.attachments_count} />
              ) : (
                <RecordEntry
                  key={`r-${entry.item.id}`}
                  record={entry.item}
                  onArchive={canArchive && !entry.item.archived_at ? () => handleArchive(entry.item) : null}
                />
              ),
            )}
          </ol>
        )}

        <div className="mt-5 border-t border-line pt-3">
          <Checkbox
            label="Mostrar registros archivados"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
        </div>
      </div>
    </section>
  )
}

function TimelineDot({ icon: Icon, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-light text-brand', stone: 'bg-stone-100 text-stone-500' }
  return (
    <span className={`absolute -left-[2.6rem] top-3 flex size-7 items-center justify-center rounded-full ring-4 ring-white ${tones[tone]}`}>
      <Icon className="size-3.5" />
    </span>
  )
}

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100/80 px-1.5 py-0.5">
      <Icon className="size-3 text-stone-400" /> {children}
    </span>
  )
}

function ConsultationEntry({ consultation: c, attachmentsCount }) {
  return (
    <li className="relative">
      <TimelineDot icon={Stethoscope} />
      <Link to={`/consultas/${c.id}`} className="block rounded-xl border border-line bg-white p-4 transition hover:border-line-strong hover:shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{c.reason}</p>
          <Badge status={CONSULTATION_STATUS[c.status]} />
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {formatDateTime(c.consulted_at)} · {c.veterinarian?.name}
        </p>

        {c.diagnosis && (
          <p className="mt-2 text-sm"><span className="font-medium">Diagnóstico:</span> {c.diagnosis}</p>
        )}
        {c.treatment && (
          <p className="mt-1 text-sm text-stone-600"><span className="font-medium text-ink">Tratamiento:</span> {c.treatment}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-stone-600">
          {c.weight && <Meta icon={Weight}>{c.weight} kg</Meta>}
          {c.temperature && <Meta icon={Thermometer}>{c.temperature} °C</Meta>}
          {c.medications?.length > 0 && <Meta icon={Pill}>{c.medications.map((m) => m.name).join(', ')}</Meta>}
          {c.exams?.length > 0 && <Meta icon={FlaskConical}>{c.exams.length} examen(es)</Meta>}
          {attachmentsCount > 0 && <Meta icon={Paperclip}>{attachmentsCount} adjunto(s)</Meta>}
          {c.follow_up_date && <Meta icon={CalendarClock}>Control {formatDate(c.follow_up_date)}</Meta>}
        </div>

        {c.records?.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
            {c.records.map((r) => (
              <li key={r.id} className="flex gap-2 text-stone-600">
                <Activity className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
                <span><span className="text-xs text-stone-400">{formatDateTime(r.recorded_at)} · </span>{r.description}</span>
              </li>
            ))}
          </ul>
        )}
      </Link>
    </li>
  )
}

function RecordEntry({ record: r, onArchive }) {
  const type = RECORD_TYPES[r.type] ?? RECORD_TYPES.note

  return (
    <li className={`relative ${r.archived_at ? 'opacity-50' : ''}`}>
      <TimelineDot icon={type.Icon} tone="stone" />
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold">
            {type.label}
            {r.title && <span className="font-normal text-stone-600"> · {r.title}</span>}
          </p>
          {r.archived_at ? (
            <span className="text-xs text-muted">Archivado</span>
          ) : (
            onArchive && (
              <button className="text-xs text-stone-400 hover:text-red-600" onClick={onArchive}>Archivar</button>
            )
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {formatDateTime(r.recorded_at)} · {r.author?.name}
          {r.consultation_id && (
            <> · <Link to={`/consultas/${r.consultation_id}`} className="hover:underline">en consulta</Link></>
          )}
        </p>
        <p className="mt-2 whitespace-pre-line text-sm">{r.description}</p>
        {r.next_date && (
          <p className="mt-2 text-xs font-medium text-brand-dark">Próxima dosis: {formatDate(r.next_date)}</p>
        )}
      </div>
    </li>
  )
}
