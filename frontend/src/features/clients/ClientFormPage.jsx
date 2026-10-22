import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { createClient, getClient, updateClient } from '../../services/clientsService'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import { DOCUMENT_TYPES } from './clientLabels'

const schema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio'),
  document_type: yup.string().required(),
  document: yup.string().trim().max(30),
  phone: yup.string().trim().max(30),
  email: yup.string().trim().email('Email inválido'),
  address: yup.string().trim(),
  city: yup.string().trim(),
  notes: yup.string(),
})

const emptyValues = {
  name: '', document_type: 'CC', document: '', phone: '', email: '', address: '', city: '', notes: '',
}

export default function ClientFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const clientQuery = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (clientQuery.data) {
      // los null de la API se muestran como campos vacíos
      reset(Object.fromEntries(Object.keys(emptyValues).map((k) => [k, clientQuery.data[k] ?? ''])))
    }
  }, [clientQuery.data, reset])

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? updateClient(id, values) : createClient(values)),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', String(client.id)] })
      navigate(`/clientes/${client.id}`)
    },
  })

  const onSubmit = (values) =>
    mutation.mutateAsync(emptyToNull(values)).catch((error) => applyServerErrors(error, setError))

  if (isEdit && clientQuery.isPending) return <Spinner />
  if (isEdit && clientQuery.error) return <ErrorState error={clientQuery.error} />

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        back={isEdit ? `/clientes/${id}` : '/clientes'}
      />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Nombre completo" required error={errors.name?.message} className="sm:col-span-2">
            <Input {...register('name')} aria-invalid={!!errors.name} autoFocus />
          </Field>

          <Field label="Tipo de documento" error={errors.document_type?.message}>
            <Select {...register('document_type')}>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Número de documento" error={errors.document?.message}>
            <Input {...register('document')} aria-invalid={!!errors.document} />
          </Field>

          <Field label="Teléfono" error={errors.phone?.message}>
            <Input type="tel" {...register('phone')} aria-invalid={!!errors.phone} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <Field label="Dirección" error={errors.address?.message}>
            <Input {...register('address')} />
          </Field>

          <Field label="Ciudad" error={errors.city?.message}>
            <Input {...register('city')} />
          </Field>

          <Field label="Observaciones" error={errors.notes?.message} className="sm:col-span-2">
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
