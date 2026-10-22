import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Camera, FileText, Pencil, Phone, Stethoscope, TriangleAlert, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Card, DetailList, ErrorState, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { deletePet, getPet, uploadPetPhoto } from '../../services/petsService'
import { todayISO } from '../../utils/format'
import { openPdf } from '../../utils/pdf'
import AppointmentFormModal from '../appointments/AppointmentFormModal'
import { QUICK_ACTIONS, RECORD_TYPES } from '../consultations/consultationLabels'
import ClinicalSummary from '../history/ClinicalSummary'
import ClinicalTimeline from '../history/ClinicalTimeline'
import RecordForm from '../history/RecordForm'
import PetAvatar from './PetAvatar'
import { sexLabel } from './petLabels'

export default function PetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [recordType, setRecordType] = useState(null)
  const [scheduling, setScheduling] = useState(false)
  const canSchedule = useCan('citas.crear')
  const canEdit = useCan('pacientes.editar')
  const canDelete = useCan('pacientes.eliminar')
  const canViewHistory = useCan('consultas.ver')
  const canCreateClinical = useCan('consultas.crear')
  const canEditClinical = useCan('consultas.editar')

  const { data: pet, isPending, error } = useQuery({ queryKey: ['pet', id], queryFn: () => getPet(id) })

  const photo = useMutation({
    mutationFn: (file) => uploadPetPhoto(id, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(['pet', id], updated)
      queryClient.invalidateQueries({ queryKey: ['pets'] })
    },
    onError: (err) => alert(err.response?.data?.errors?.photo?.[0] ?? 'No se pudo subir la foto.'),
  })

  const removal = useMutation({
    mutationFn: () => deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      queryClient.invalidateQueries({ queryKey: ['client', String(pet.client_id)] })
      navigate('/pacientes', { replace: true })
    },
  })

  if (isPending) return <Spinner />
  if (error) return <ErrorState error={error} />

  const handleDelete = () => {
    if (confirm(`¿Eliminar a ${pet.name}? Su historia clínica se conserva archivada.`)) removal.mutate()
  }

  const onRecordSaved = () => {
    setRecordType(null)
    queryClient.invalidateQueries({ queryKey: ['history', id] })
    queryClient.invalidateQueries({ queryKey: ['clinical-summary', id] })
  }

  const canAttend = canCreateClinical && !pet.deceased_at

  return (
    <div className="space-y-5">
      <Link to="/pacientes" className="inline-flex items-center gap-1 text-[13px] text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" /> Pacientes
      </Link>

      {/* encabezado: quién es el paciente */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="relative">
          <PetAvatar pet={pet} size="lg" />
          {canEdit && (
            <>
              <button
                type="button"
                title={pet.photo_url ? 'Cambiar foto' : 'Agregar foto'}
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-line bg-white text-stone-500 shadow-card transition hover:text-brand disabled:opacity-50"
                onClick={() => fileInput.current.click()}
                disabled={photo.isPending}
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files[0] && photo.mutate(e.target.files[0])}
              />
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight">
            {pet.name}
            {pet.deceased_at && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 align-middle text-xs font-normal text-muted">Fallecido</span>}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[pet.species, pet.breed, sexLabel(pet.sex), pet.age, pet.weight && `${pet.weight} kg`].filter(Boolean).map((chip) => (
              <span key={chip} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{chip}</span>
            ))}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <Link to={`/clientes/${pet.client.id}`} className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-brand-dark">
              <UserRound className="size-3.5 text-stone-400" /> {pet.client.name}
            </Link>
            {pet.client.phone && (
              <a href={`tel:${pet.client.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Phone className="size-3.5 text-stone-400" /> {pet.client.phone}
              </a>
            )}
          </p>
        </div>
      </div>

      {canViewHistory ? (
        <>
          <ClinicalSummary pet={pet} canContinue={canEditClinical} />

          {/* acciones del médico */}
          {canAttend && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" icon={Stethoscope} to={`/consultas/nueva?mascota=${pet.id}`}>
                Nueva consulta
              </Button>
              <span className="mx-1 hidden h-7 w-px bg-line-strong sm:block" />
              {canSchedule && (
                <Button variant="secondary" icon={CalendarPlus} onClick={() => setScheduling(true)}>Agendar cita</Button>
              )}
              {QUICK_ACTIONS.map((type) => (
                <Button
                  key={type}
                  variant={recordType === type ? 'soft' : 'secondary'}
                  icon={RECORD_TYPES[type].Icon}
                  onClick={() => setRecordType(recordType === type ? null : type)}
                >
                  {RECORD_TYPES[type].action}
                </Button>
              ))}
            </div>
          )}

          {recordType && (
            <RecordForm
              key={recordType}
              petId={pet.id}
              type={recordType}
              onSaved={onRecordSaved}
              onCancel={() => setRecordType(null)}
            />
          )}
        </>
      ) : (
        pet.allergies && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
            <TriangleAlert className="size-4 shrink-0 text-rose-500" />
            <span><span className="font-semibold">Alergias:</span> {pet.allergies}</span>
          </div>
        )
      )}

      {scheduling && (
        <AppointmentFormModal
          initial={{ pet, date: todayISO(), time: '08:00' }}
          onClose={() => setScheduling(false)}
          onSaved={() => {
            setScheduling(false)
            queryClient.invalidateQueries({ queryKey: ['clinical-summary', id] })
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
          }}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {canViewHistory && (
          <div className="lg:col-span-2">
            <ClinicalTimeline petId={pet.id} />
          </div>
        )}

        <div className={`space-y-5 ${canViewHistory ? '' : 'lg:col-span-3'}`}>
          <Card
            title="Datos del paciente"
            actions={canEdit && (
              <Button variant="ghost" size="sm" icon={Pencil} to={`/pacientes/${id}/editar`}>Editar datos</Button>
            )}
          >
            <DetailList
              items={[
                ['Esterilizado', pet.is_sterilized ? 'Sí' : 'No'],
                ['Nacimiento', pet.birth_date],
                ['Color / señas', pet.color],
                ['Microchip', pet.microchip],
              ]}
            />
            {pet.notes && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-medium text-muted">Notas</p>
                <p className="mt-0.5 whitespace-pre-line text-sm">{pet.notes}</p>
              </div>
            )}
            {canViewHistory && (
              <div className="mt-4 border-t border-line pt-3">
                <Button variant="secondary" icon={FileText} className="w-full" onClick={() => openPdf(`/pets/${pet.id}/history.pdf`)}>
                  Historia clínica en PDF
                </Button>
              </div>
            )}
            {canDelete && (
              <div className="mt-4 border-t border-line pt-3 text-right">
                <button
                  type="button"
                  className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={removal.isPending}
                >
                  Eliminar paciente
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
