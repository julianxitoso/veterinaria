import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Package, Plus, Save, ShoppingBag, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import CollapsibleSection from '../../components/ui/CollapsibleSection'
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import {
  createConsultation,
  getConsultation,
  listVeterinarians,
  updateConsultation,
} from '../../services/consultationsService'
import { getPet } from '../../services/petsService'
import { useAuthStore } from '../../store/authStore'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import { formatDate, formatMoney, formatQty, toDateTimeLocal } from '../../utils/format'
import PetPicker from '../pets/PetPicker'
import { RECORD_TYPES, ROUTES, WITH_NEXT_DATE } from './consultationLabels'
import MedicationNameInput from './MedicationNameInput'

const toNumber = (v) => Number(String(v).replace(',', '.'))

const optionalNumber = (min, max, message) =>
  yup.string().test('number', message, (v) => !v || (!isNaN(toNumber(v)) && toNumber(v) >= min && toNumber(v) <= max))

const schema = yup.object({
  user_id: yup.string(),
  consulted_at: yup.string().required('La fecha es obligatoria'),
  reason: yup.string().trim().required('El motivo de consulta es obligatorio'),
  anamnesis: yup.string(),
  weight: optionalNumber(0, 9999, 'Peso inválido'),
  temperature: optionalNumber(25, 45, 'Entre 25 y 45 °C'),
  heart_rate: optionalNumber(1, 500, 'Valor inválido'),
  respiratory_rate: optionalNumber(1, 300, 'Valor inválido'),
  physical_exam: yup.string(),
  diagnosis: yup.string(),
  treatment: yup.string(),
  instructions: yup.string(),
  observations: yup.string(),
  follow_up_date: yup.string(),
  medications: yup.array(
    yup.object({
      name: yup.string().trim().required('Nombre obligatorio'),
      quantity: yup.string().test('qty', 'Indica la cantidad', function (v) {
        return !this.parent.dispense || (Boolean(v) && toNumber(v) > 0)
      }),
    }),
  ),
  exams: yup.array(yup.object({ name: yup.string().trim().required('Nombre obligatorio') })),
  applications: yup.array(yup.object({ title: yup.string().trim().required('Producto obligatorio') })),
})

const TEXT_FIELDS = [
  'reason', 'anamnesis', 'physical_exam', 'diagnosis', 'treatment', 'instructions', 'observations', 'follow_up_date',
]
const NUMBER_FIELDS = ['weight', 'temperature', 'heart_rate', 'respiratory_rate']

const MEDICATION_TEXT = ['name', 'dose', 'frequency', 'duration', 'route', 'notes']
// `product` solo se usa para mostrar stock/precio; no se envía a la API
const emptyMedication = { ...Object.fromEntries(MEDICATION_TEXT.map((k) => [k, ''])), product_id: null, product: null, dispense: false, quantity: '' }
const emptyExam = { name: '', notes: '' }
const emptyApplication = { type: 'vaccine', title: '', next_date: '' }

export default function ConsultationFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()
  const presetPetId = searchParams.get('mascota')
  const appointmentId = searchParams.get('cita')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  // undefined = sin elegir aún; null = el usuario quitó la selección
  const [pickedPet, setPickedPet] = useState(undefined)

  const consultationQuery = useQuery({ queryKey: ['consultation', id], queryFn: () => getConsultation(id), enabled: isEdit })
  const presetPetQuery = useQuery({ queryKey: ['pet', presetPetId], queryFn: () => getPet(presetPetId), enabled: !isEdit && Boolean(presetPetId) })
  const { data: vetList } = useQuery({ queryKey: ['veterinarians'], queryFn: listVeterinarians, staleTime: 5 * 60_000 })

  const consultation = consultationQuery.data
  const pet = isEdit ? consultation?.pet : pickedPet !== undefined ? pickedPet : (presetPetQuery.data ?? null)

  // al editar, el veterinario asignado siempre debe estar entre las opciones
  const assignedVet = consultation?.veterinarian
  const vets = assignedVet && vetList && !vetList.some((v) => v.id === assignedVet.id) ? [...vetList, assignedVet] : vetList

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      user_id: '',
      consulted_at: toDateTimeLocal(),
      ...Object.fromEntries([...TEXT_FIELDS, ...NUMBER_FIELDS].map((k) => [k, ''])),
      // al iniciar desde una cita, el motivo viene de ella
      reason: searchParams.get('motivo') ?? '',
      medications: [],
      exams: [],
      applications: [],
    },
  })

  const medications = useFieldArray({ control, name: 'medications' })
  const watchedMeds = useWatch({ control, name: 'medications' })

  const unlinkProduct = (i) => {
    setValue(`medications.${i}.product_id`, null)
    setValue(`medications.${i}.product`, null)
    setValue(`medications.${i}.dispense`, false)
    setValue(`medications.${i}.quantity`, '')
  }
  const exams = useFieldArray({ control, name: 'exams', keyName: 'key' })
  const applications = useFieldArray({ control, name: 'applications' })

  useEffect(() => {
    if (!consultation) return

    reset({
      user_id: String(consultation.veterinarian?.id ?? ''),
      consulted_at: toDateTimeLocal(consultation.consulted_at),
      ...Object.fromEntries([...TEXT_FIELDS, ...NUMBER_FIELDS].map((k) => [k, consultation[k] == null ? '' : String(consultation[k])])),
      medications: consultation.medications.map((m) => ({
        ...Object.fromEntries(MEDICATION_TEXT.map((k) => [k, m[k] ?? ''])),
        product_id: m.product_id,
        product: m.product,
        dispense: m.dispense,
        quantity: m.quantity == null ? '' : String(Number(m.quantity)),
      })),
      exams: consultation.exams.map((e) => ({ id: e.id, name: e.name, notes: e.notes ?? '' })),
      applications: [],
    })
  }, [consultation, reset])

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? updateConsultation(id, values) : createConsultation(values)),
    onSuccess: (saved) => {
      const petId = String(saved.pet_id)
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['history', petId] })
      queryClient.invalidateQueries({ queryKey: ['clinical-summary', petId] })
      queryClient.invalidateQueries({ queryKey: ['pet', petId] })
      queryClient.setQueryData(['consultation', String(saved.id)], saved)

      // finalizada → ver el resumen; en curso → volver a la ficha del paciente
      navigate(saved.status === 'closed' ? `/consultas/${saved.id}` : `/pacientes/${petId}`, { replace: isEdit })
    },
  })

  const submit = (values, finalize) => {
    if (!pet) {
      setError('pet_id', { message: 'Selecciona el paciente' })
      return
    }

    if (finalize && !confirm('¿Finalizar la consulta? Después solo podrás agregar notas de evolución y resultados de exámenes.')) {
      return
    }

    const payload = {
      ...emptyToNull(Object.fromEntries([...TEXT_FIELDS, 'user_id', 'consulted_at'].map((k) => [k, values[k]]))),
      ...Object.fromEntries(NUMBER_FIELDS.map((k) => [k, values[k] ? toNumber(values[k]) : null])),
      medications: values.medications.map((m) => ({
        ...emptyToNull(Object.fromEntries(MEDICATION_TEXT.map((k) => [k, m[k]]))),
        product_id: m.product_id,
        dispense: Boolean(m.product_id && m.dispense),
        quantity: m.product_id && m.dispense ? toNumber(m.quantity) : null,
      })),
      exams: values.exams.map(emptyToNull),
      applications: values.applications.map(emptyToNull),
      finalize,
      ...(!isEdit && { pet_id: pet.id }),
      ...(!isEdit && appointmentId && { appointment_id: Number(appointmentId) }),
    }

    return mutation.mutateAsync(payload).catch((error) => applyServerErrors(error, setError))
  }

  if (isEdit && consultationQuery.isPending) return <Spinner />
  if (isEdit && consultationQuery.error) return <ErrorState error={consultationQuery.error} />
  if (isEdit && consultation.status !== 'open') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Esta consulta ya fue finalizada y no se puede editar. Agrega una nota de evolución desde el detalle.
      </div>
    )
  }

  const err = (name) => errors[name]?.message
  const appliedBefore = consultation?.records.filter((r) => WITH_NEXT_DATE.includes(r.type)) ?? []
  const hasFollowUpData = Boolean(consultation?.instructions || consultation?.follow_up_date || consultation?.observations)

  return (
    <div className="max-w-4xl pb-24">
      <PageHeader
        title={isEdit ? 'Continuar consulta' : 'Nueva consulta'}
        back={pet ? `/pacientes/${pet.id}` : '/consultas'}
      />

      <form onSubmit={handleSubmit((v) => submit(v, false))} className="space-y-4" noValidate>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paciente" required error={err('pet_id')} className="sm:col-span-2">
              <PetPicker
                value={pet}
                disabled={isEdit || Boolean(presetPetId)}
                invalid={!!errors.pet_id}
                onChange={(p) => {
                  setPickedPet(p)
                  if (p) clearErrors('pet_id')
                }}
              />
            </Field>

            {pet?.allergies && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-sm text-rose-900 sm:col-span-2">
                <TriangleAlert className="size-4 shrink-0 text-rose-500" />
                <span><span className="font-semibold">Alergias:</span> {pet.allergies}</span>
              </div>
            )}

            <Field label="Motivo de consulta" required error={err('reason')} className="sm:col-span-2">
              <Input {...register('reason')} aria-invalid={!!errors.reason} autoFocus={!isEdit} placeholder="¿Por qué viene hoy?" />
            </Field>

            <Field label="Anamnesis / síntomas" error={err('anamnesis')} className="sm:col-span-2">
              <Textarea rows={3} {...register('anamnesis')} placeholder="Lo que refiere el dueño, desde cuándo…" />
            </Field>
          </div>
        </Card>

        <Card title="Examen físico">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Peso (kg)" error={err('weight')}>
              <Input inputMode="decimal" {...register('weight')} placeholder={pet?.weight ?? ''} />
            </Field>
            <Field label="Temperatura (°C)" error={err('temperature')}>
              <Input inputMode="decimal" {...register('temperature')} />
            </Field>
            <Field label="Frec. cardiaca (lpm)" error={err('heart_rate')}>
              <Input inputMode="numeric" {...register('heart_rate')} />
            </Field>
            <Field label="Frec. respiratoria (rpm)" error={err('respiratory_rate')}>
              <Input inputMode="numeric" {...register('respiratory_rate')} />
            </Field>
            <Field label="Hallazgos" error={err('physical_exam')} className="col-span-2 md:col-span-4">
              <Textarea rows={2} {...register('physical_exam')} placeholder="Mucosas, hidratación, ganglios, auscultación…" />
            </Field>
          </div>
        </Card>

        <Card title="Diagnóstico y tratamiento">
          <div className="grid gap-4">
            <Field label="Diagnóstico" error={err('diagnosis')}>
              <Textarea rows={2} {...register('diagnosis')} />
            </Field>
            <Field label="Tratamiento" error={err('treatment')}>
              <Textarea rows={2} {...register('treatment')} />
            </Field>
          </div>
        </Card>

        {/* secciones opcionales: se abren solo si se necesitan */}
        <CollapsibleSection
          title="Medicamentos"
          hint="Fórmula médica"
          defaultOpen={medications.fields.length > 0 || Boolean(consultation?.medications.length)}
          onOpen={() => medications.fields.length === 0 && medications.append(emptyMedication)}
        >
          <div className="space-y-3">
            {medications.fields.map((field, i) => (
              <div key={field.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-6">
                <Field label="Medicamento" required error={errors.medications?.[i]?.name?.message} className="sm:col-span-3">
                  <Controller
                    control={control}
                    name={`medications.${i}.name`}
                    render={({ field: nameField }) => (
                      <MedicationNameInput
                        value={nameField.value}
                        invalid={!!errors.medications?.[i]?.name}
                        onChange={(text) => {
                          nameField.onChange(text)
                          // si se cambia el nombre, deja de estar vinculado al producto
                          if (watchedMeds?.[i]?.product && text !== watchedMeds[i].product.name) unlinkProduct(i)
                        }}
                        onSelectProduct={(product) => {
                          nameField.onChange(product.name)
                          setValue(`medications.${i}.product_id`, product.id)
                          setValue(`medications.${i}.product`, product)
                        }}
                      />
                    )}
                  />
                </Field>
                <Field label="Dosis" className="sm:col-span-3">
                  <Input {...register(`medications.${i}.dose`)} placeholder="Ej. 1 tableta" />
                </Field>
                <Field label="Frecuencia" className="sm:col-span-2">
                  <Input {...register(`medications.${i}.frequency`)} placeholder="Cada 12 horas" />
                </Field>
                <Field label="Duración" className="sm:col-span-2">
                  <Input {...register(`medications.${i}.duration`)} placeholder="7 días" />
                </Field>
                <Field label="Vía" className="sm:col-span-2">
                  <Input list="routes-list" {...register(`medications.${i}.route`)} />
                </Field>
                <Field label="Indicaciones" className="sm:col-span-5">
                  <Input {...register(`medications.${i}.notes`)} />
                </Field>
                <div className="flex items-end sm:col-span-1">
                  <Button variant="ghost" icon={Trash2} className="w-full text-stone-500 hover:text-red-600" onClick={() => medications.remove(i)}>Quitar</Button>
                </div>

                {watchedMeds?.[i]?.product && (
                  <DispenseRow
                    product={watchedMeds[i].product}
                    dispense={watchedMeds[i].dispense}
                    quantity={watchedMeds[i].quantity}
                    register={register}
                    index={i}
                    error={errors.medications?.[i]?.quantity?.message}
                  />
                )}
              </div>
            ))}
            <Button variant="soft" size="sm" icon={Plus} onClick={() => medications.append(emptyMedication)}>Otro medicamento</Button>
          </div>
          <datalist id="routes-list">
            {ROUTES.map((r) => <option key={r} value={r} />)}
          </datalist>
        </CollapsibleSection>

        <CollapsibleSection
          title="Exámenes solicitados"
          hint="Laboratorio, imágenes…"
          defaultOpen={Boolean(consultation?.exams.length)}
          onOpen={() => exams.fields.length === 0 && exams.append(emptyExam)}
        >
          <div className="space-y-3">
            {exams.fields.map((field, i) => (
              <div key={field.key} className="grid gap-3 sm:grid-cols-12">
                <Field label="Examen" required error={errors.exams?.[i]?.name?.message} className="sm:col-span-4">
                  <Input {...register(`exams.${i}.name`)} placeholder="Ej. Hemograma" />
                </Field>
                <Field label="Observaciones" className="sm:col-span-6">
                  <Input {...register(`exams.${i}.notes`)} />
                </Field>
                <div className="flex items-end sm:col-span-2">
                  <Button variant="ghost" icon={Trash2} className="w-full text-stone-500 hover:text-red-600" onClick={() => exams.remove(i)}>Quitar</Button>
                </div>
              </div>
            ))}
            <Button variant="soft" size="sm" icon={Plus} onClick={() => exams.append(emptyExam)}>Otro examen</Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Vacunas / desparasitación aplicadas"
          hint="Quedan en la historia con su próxima dosis"
          defaultOpen={appliedBefore.length > 0}
          onOpen={() => applications.fields.length === 0 && applications.append(emptyApplication)}
        >
          <div className="space-y-3">
            {appliedBefore.length > 0 && (
              <ul className="space-y-1 text-sm text-stone-600">
                {appliedBefore.map((r) => (
                  <li key={r.id} className="flex items-center gap-1.5">
                    <CircleCheck className="size-4 text-emerald-500" /> {r.title}
                    {r.next_date && <span className="text-stone-400"> · próxima dosis {formatDate(r.next_date)}</span>}
                  </li>
                ))}
              </ul>
            )}
            {applications.fields.map((field, i) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-12">
                <Field label="Tipo" className="sm:col-span-3">
                  <Select {...register(`applications.${i}.type`)}>
                    {WITH_NEXT_DATE.map((t) => <option key={t} value={t}>{RECORD_TYPES[t].label}</option>)}
                  </Select>
                </Field>
                <Field label="Producto" required error={errors.applications?.[i]?.title?.message} className="sm:col-span-4">
                  <Input {...register(`applications.${i}.title`)} placeholder="Ej. Antirrábica" />
                </Field>
                <Field label="Próxima dosis" className="sm:col-span-3">
                  <Input type="date" {...register(`applications.${i}.next_date`)} />
                </Field>
                <div className="flex items-end sm:col-span-2">
                  <Button variant="ghost" icon={Trash2} className="w-full text-stone-500 hover:text-red-600" onClick={() => applications.remove(i)}>Quitar</Button>
                </div>
              </div>
            ))}
            <Button variant="soft" size="sm" icon={Plus} onClick={() => applications.append(emptyApplication)}>Otra aplicación</Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Indicaciones y control" hint="Para el dueño, fecha de control" defaultOpen={hasFollowUpData}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Indicaciones para el dueño" error={err('instructions')} className="sm:col-span-3">
              <Textarea rows={3} {...register('instructions')} />
            </Field>
            <Field label="Fecha de control" error={err('follow_up_date')}>
              <Input type="date" {...register('follow_up_date')} />
            </Field>
            <Field label="Observaciones médicas (internas)" error={err('observations')} className="sm:col-span-3">
              <Textarea rows={2} {...register('observations')} />
            </Field>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Fecha y veterinario" hint={`Ahora · ${currentUser?.name ?? ''}`} defaultOpen={isEdit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha y hora" required error={err('consulted_at')}>
              <Input type="datetime-local" {...register('consulted_at')} />
            </Field>
            <Field label="Veterinario" error={err('user_id')}>
              <Select {...register('user_id')}>
                <option value="">— Yo ({currentUser?.name}) —</option>
                {vets?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
          </div>
        </CollapsibleSection>

        <FormError message={errors.root?.message ?? errors.status?.message} />

        {/* barra fija: siempre a mano sin bajar hasta el final */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/85 px-4 py-3 backdrop-blur-md md:left-64">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
            <span className="hidden sm:contents">
              <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
            </span>
            <Button type="submit" variant="secondary" icon={Save} className="flex-1 sm:flex-initial" disabled={isSubmitting}>
              <span className="sm:hidden">Guardar</span>
              <span className="hidden sm:inline">Guardar y seguir después</span>
            </Button>
            <Button icon={CircleCheck} className="flex-1 sm:flex-initial" onClick={handleSubmit((v) => submit(v, true))} disabled={isSubmitting}>
              Finalizar<span className="hidden sm:inline">&nbsp;consulta</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

/**
 * Producto del inventario vinculado al medicamento: permite marcar si el
 * cliente se lo lleva (se facturará y descontará del stock).
 */
function DispenseRow({ product, dispense, quantity, register, index, error }) {
  const stock = Number(product.stock)
  const exceeds = dispense && quantity && toNumber(quantity) > stock

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-stone-50 px-3 py-2 text-sm sm:col-span-6">
      <span className="inline-flex items-center gap-1.5 text-stone-600">
        <Package className="size-4 text-stone-400" />
        En inventario · {formatMoney(product.price)} / {product.unit} ·{' '}
        <span className={stock <= 0 ? 'text-red-600' : ''}>{stock <= 0 ? 'Agotado' : `Stock: ${formatQty(stock)}`}</span>
      </span>
      <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
        <input type="checkbox" className="size-4 accent-brand" {...register(`medications.${index}.dispense`)} />
        <ShoppingBag className="size-4 text-violet-500" /> Lo lleva
      </label>
      {dispense && (
        <label className="inline-flex items-center gap-2">
          Cantidad
          <input
            inputMode="decimal"
            className="w-20 rounded-lg border border-line-strong px-2 py-1 text-sm outline-none focus:border-brand"
            {...register(`medications.${index}.quantity`)}
          />
          {product.unit}
        </label>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {exceeds && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
          <TriangleAlert className="size-3.5" /> Supera el stock disponible
        </span>
      )}
    </div>
  )
}
