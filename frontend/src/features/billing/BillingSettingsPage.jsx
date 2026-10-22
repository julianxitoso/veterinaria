import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Textarea } from '../../components/ui/Form'
import { Card, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { getBillingSettings, updateBillingSettings } from '../../services/billingService'
import { applyServerErrors } from '../../utils/apiErrors'
import SettingsTabs from '../settings/SettingsTabs'

/**
 * Numeración consecutiva y pie de página de las facturas.
 */
export default function BillingSettingsPage() {
  const queryClient = useQueryClient()
  const canEdit = useCan('configuracion.editar')
  const { data, isPending } = useQuery({ queryKey: ['billing-settings'], queryFn: getBillingSettings })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm()

  const [prefix, nextNumber] = useWatch({ control, name: ['prefix', 'next_number'] })

  useEffect(() => {
    if (data) reset({ prefix: data.prefix, next_number: String(data.next_number), footer: data.footer ?? '' })
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: updateBillingSettings,
    onSuccess: (saved) => queryClient.setQueryData(['billing-settings'], saved),
  })

  const onSubmit = (values) =>
    mutation.mutateAsync({ ...values, next_number: Number(values.next_number) }).catch((error) => applyServerErrors(error, setError))

  if (isPending) return <Spinner />

  const err = (f) => errors[f]?.message

  return (
    <div className="max-w-4xl">
      <PageHeader title="Configuración" subtitle="Numeración y documentos de venta" />
      <SettingsTabs />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5" noValidate>
        <fieldset disabled={!canEdit} className="space-y-5">
          <Card title="Numeración de facturas">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Prefijo" error={err('prefix')}><Input {...register('prefix')} placeholder="FV-" /></Field>
              <Field label="Siguiente número" error={err('next_number')}><Input inputMode="numeric" {...register('next_number')} /></Field>
              <div className="text-sm sm:pt-6">
                <span className="text-muted">Próxima factura: </span>
                <strong>{prefix}{String(nextNumber ?? '').padStart(5, '0')}</strong>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">El consecutivo no puede volver a un número ya usado.</p>
          </Card>

          <Card title="Pie de página de la factura">
            <Field label="Texto" error={err('footer')}><Textarea rows={2} {...register('footer')} /></Field>
            <p className="mt-2 text-xs text-muted">
              Este documento es un comprobante interno. La facturación electrónica ante la DIAN está planeada para una fase posterior.
            </p>
          </Card>
        </fieldset>

        {canEdit && (
          <div className="flex items-center justify-end gap-3">
            <FormError message={errors.root?.message} />
            {mutation.isSuccess && !isDirty && <span className="text-sm text-emerald-700">Cambios guardados ✓</span>}
            <Button type="submit" disabled={isSubmitting || !isDirty}>Guardar</Button>
          </div>
        )}
      </form>
    </div>
  )
}
