import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import { Checkbox, Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { getClient } from '../../services/clientsService'
import { createPet, getPet, updatePet } from '../../services/petsService'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import ClientPicker from '../clients/ClientPicker'
import { SEXES, SPECIES } from './petLabels'

const today = () => new Date().toISOString().slice(0, 10)

// el dueño se valida aparte (viene del ClientPicker, no de un input)
const schema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio'),
  species: yup.string().trim().required('La especie es obligatoria'),
  breed: yup.string().trim(),
  sex: yup.string().oneOf(Object.keys(SEXES)).required(),
  is_sterilized: yup.boolean(),
  birth_date: yup.string().test('past', 'No puede ser una fecha futura', (v) => !v || v <= today()),
  weight: yup.string().matches(/^$|^\d+([.,]\d{1,2})?$/, 'Peso inválido (ej. 12.5)'),
  color: yup.string().trim(),
  microchip: yup.string().trim(),
  allergies: yup.string(),
  notes: yup.string(),
})

const emptyValues = {
  name: '', species: '', breed: '', sex: 'unknown', is_sterilized: false,
  birth_date: '', weight: '', color: '', microchip: '', allergies: '', notes: '',
}

export default function PetFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()
  const presetClientId = searchParams.get('cliente')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // undefined = el usuario aún no ha elegido; null = quitó la selección
  const [pickedOwner, setPickedOwner] = useState(undefined)

  const petQuery = useQuery({ queryKey: ['pet', id], queryFn: () => getPet(id), enabled: isEdit })

  // al crear desde la ficha del cliente, el dueño viene preseleccionado
  const presetClientQuery = useQuery({
    queryKey: ['client', presetClientId],
    queryFn: () => getClient(presetClientId),
    enabled: !isEdit && Boolean(presetClientId),
  })

  const owner =
    pickedOwner !== undefined ? pickedOwner : (petQuery.data?.client ?? presetClientQuery.data ?? null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (petQuery.data) {
      const pet = petQuery.data
      reset(Object.fromEntries(Object.keys(emptyValues).map((k) => [k, pet[k] ?? emptyValues[k]])))
    }
  }, [petQuery.data, reset])

  const selectOwner = (client) => {
    setPickedOwner(client)
    if (client) clearErrors('client_id')
  }

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? updatePet(id, values) : createPet(values)),
    onSuccess: (pet) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      queryClient.invalidateQueries({ queryKey: ['pet', String(pet.id)] })
      queryClient.invalidateQueries({ queryKey: ['client', String(pet.client_id)] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate(`/pacientes/${pet.id}`)
    },
  })

  const onSubmit = (values) => {
    if (!owner) {
      setError('client_id', { message: 'Selecciona el dueño' })
      return
    }

    const payload = emptyToNull({ ...values, client_id: owner.id, weight: values.weight.replace(',', '.') })
    return mutation.mutateAsync(payload).catch((error) => applyServerErrors(error, setError))
  }

  if (isEdit && petQuery.isPending) return <Spinner />
  if (isEdit && petQuery.error) return <ErrorState error={petQuery.error} />

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? `Editar a ${petQuery.data.name}` : 'Nueva mascota'}
        back={isEdit ? `/pacientes/${id}` : presetClientId ? `/clientes/${presetClientId}` : '/pacientes'}
      />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Dueño" required error={errors.client_id?.message} className="sm:col-span-2">
            <ClientPicker value={owner} onChange={selectOwner} invalid={!!errors.client_id} />
          </Field>

          <Field label="Nombre" required error={errors.name?.message}>
            <Input {...register('name')} aria-invalid={!!errors.name} />
          </Field>

          <Field label="Especie" required error={errors.species?.message}>
            <Input list="species-list" {...register('species')} aria-invalid={!!errors.species} />
            <datalist id="species-list">
              {SPECIES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>

          <Field label="Raza" error={errors.breed?.message}>
            <Input {...register('breed')} />
          </Field>

          <Field label="Sexo" error={errors.sex?.message}>
            <Select {...register('sex')}>
              {Object.entries(SEXES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>

          <Field label="Fecha de nacimiento" error={errors.birth_date?.message}>
            <Input type="date" max={today()} {...register('birth_date')} aria-invalid={!!errors.birth_date} />
          </Field>

          <Field label="Peso (kg)" error={errors.weight?.message}>
            <Input inputMode="decimal" placeholder="Ej. 12.5" {...register('weight')} aria-invalid={!!errors.weight} />
          </Field>

          <Field label="Color / señas" error={errors.color?.message}>
            <Input {...register('color')} />
          </Field>

          <Field label="Microchip" error={errors.microchip?.message}>
            <Input {...register('microchip')} />
          </Field>

          <div className="sm:col-span-2">
            <Checkbox label="Esterilizado(a)" {...register('is_sterilized')} />
          </div>

          <Field label="Alergias" error={errors.allergies?.message} className="sm:col-span-2">
            <Textarea rows={2} {...register('allergies')} placeholder="Medicamentos, alimentos…" />
          </Field>

          <Field label="Notas generales" error={errors.notes?.message} className="sm:col-span-2">
            <Textarea {...register('notes')} />
          </Field>

          <div className="sm:col-span-2">
            <FormError message={errors.root?.message} />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
