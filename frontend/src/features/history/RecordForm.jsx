import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Textarea } from '../../components/ui/Form'
import { createRecord } from '../../services/historyService'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import { toDateTimeLocal } from '../../utils/format'
import { RECORD_TYPES, WITH_NEXT_DATE } from '../consultations/consultationLabels'

/**
 * Formulario corto para una entrada de la historia clínica de tipo `type`
 * (vacuna, desparasitación, procedimiento, nota o evolución de una consulta).
 */
export default function RecordForm({ petId, type, consultationId, onSaved, onCancel }) {
  const config = RECORD_TYPES[type]
  const hasNextDate = WITH_NEXT_DATE.includes(type)
  const titleRequired = hasNextDate || type === 'procedure'

  const schema = yup.object({
    title: titleRequired ? yup.string().trim().required('Este campo es obligatorio') : yup.string().trim(),
    description: hasNextDate ? yup.string() : yup.string().trim().required('La descripción es obligatoria'),
    recorded_at: yup.string().required('La fecha es obligatoria'),
    next_date: yup.string(),
  })

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { title: '', description: '', recorded_at: toDateTimeLocal(), next_date: '' },
  })

  const mutation = useMutation({
    mutationFn: (values) => createRecord(petId, values),
    onSuccess: onSaved,
  })

  const onSubmit = (values) => {
    const description = values.description.trim() || `${config.label} aplicada.`
    return mutation
      .mutateAsync(emptyToNull({ ...values, description, type, consultation_id: consultationId }))
      .catch((error) => applyServerErrors(error, setError))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border-2 border-brand/40 bg-white p-4" noValidate>
      <p className="mb-3 font-semibold">
        {config.icon} {type === 'evolution' ? 'Nota de evolución' : `Registrar ${config.label.toLowerCase()}`}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {type !== 'evolution' && (
          <Field label={config.titleLabel} required={titleRequired} error={errors.title?.message}>
            <Input {...register('title')} placeholder={config.titlePlaceholder} autoFocus />
          </Field>
        )}

        <Field label="Fecha y hora" error={errors.recorded_at?.message}>
          <Input type="datetime-local" {...register('recorded_at')} />
        </Field>

        {hasNextDate && (
          <Field label="Próxima dosis" error={errors.next_date?.message}>
            <Input type="date" {...register('next_date')} />
          </Field>
        )}

        <Field
          label={hasNextDate ? 'Observaciones' : 'Descripción'}
          required={!hasNextDate}
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <Textarea
            rows={hasNextDate ? 2 : 3}
            {...register('description')}
            placeholder={hasNextDate ? 'Opcional: lote, reacciones…' : ''}
            autoFocus={type === 'evolution'}
          />
        </Field>
      </div>

      <div className="mt-3">
        <FormError message={errors.root?.message ?? errors.consultation_id?.message ?? errors.type?.message} />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  )
}
