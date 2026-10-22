import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Button from '../../components/ui/Button'
import { Field, FormError, Input } from '../../components/ui/Form'
import { createMovement } from '../../services/inventoryService'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import { formatQty } from '../../utils/format'
import { EXIT_REASONS, MOVEMENT_TYPES } from './inventoryLabels'

const TABS = ['entry', 'exit', 'adjustment']

const HELP = {
  entry: 'Compra o ingreso de mercancía.',
  exit: 'Uso interno, vencidos, dañados o devoluciones. Las ventas se registran al facturar.',
  adjustment: 'Escribe la cantidad real que contaste; el sistema registra la diferencia.',
}

/**
 * Registro de entrada, salida o ajuste de stock de un producto.
 */
export default function MovementForm({ product, onSaved }) {
  const [type, setType] = useState('entry')

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              type === t ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-stone-700'
            }`}
          >
            {MOVEMENT_TYPES[t].icon} {MOVEMENT_TYPES[t].label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted">{HELP[type]}</p>
      <TypedForm key={type} type={type} product={product} onSaved={onSaved} />
    </div>
  )
}

function TypedForm({ type, product, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { quantity: '', reason: '', reference: '', unit_cost: type === 'entry' ? String(Number(product.cost)) : '', lot: '', expires_at: '' },
  })

  const mutation = useMutation({
    mutationFn: (values) => createMovement(product.id, values),
    onSuccess: (updated) => {
      reset()
      onSaved(updated)
    },
  })

  const onSubmit = (values) => {
    const quantity = Number(String(values.quantity).replace(',', '.'))
    if (values.quantity === '' || isNaN(quantity) || quantity < 0 || (type !== 'adjustment' && quantity === 0)) {
      setError('quantity', { message: 'Cantidad inválida' })
      return
    }
    if (type !== 'entry' && !values.reason.trim()) {
      setError('reason', { message: 'Indica el motivo' })
      return
    }

    const payload = emptyToNull({
      ...values,
      type,
      quantity,
      unit_cost: values.unit_cost === '' ? '' : Number(String(values.unit_cost).replace(',', '.')),
    })
    return mutation.mutateAsync(payload).catch((error) => applyServerErrors(error, setError))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field
        label={type === 'adjustment' ? `Cantidad contada (sistema: ${formatQty(product.stock)})` : `Cantidad (${product.unit})`}
        required
        error={errors.quantity?.message}
      >
        <Input inputMode="decimal" {...register('quantity')} autoFocus />
      </Field>

      {type === 'entry' ? (
        <>
          <Field label="Costo unitario" error={errors.unit_cost?.message}>
            <Input inputMode="decimal" {...register('unit_cost')} />
          </Field>
          <Field label="Factura / referencia" error={errors.reference?.message}>
            <Input {...register('reference')} placeholder="Ej. FV-1234" />
          </Field>
          <Field label="Lote" error={errors.lot?.message}>
            <Input {...register('lot')} />
          </Field>
          <Field label="Vencimiento del lote" error={errors.expires_at?.message}>
            <Input type="date" {...register('expires_at')} />
          </Field>
          <Field label="Motivo" error={errors.reason?.message}>
            <Input {...register('reason')} placeholder="Compra" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Motivo" required error={errors.reason?.message}>
            <Input list={type === 'exit' ? 'exit-reasons' : undefined} {...register('reason')} placeholder={type === 'adjustment' ? 'Ej. Conteo mensual' : ''} />
            <datalist id="exit-reasons">{EXIT_REASONS.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          <Field label="Referencia" error={errors.reference?.message} className="sm:col-span-2">
            <Input {...register('reference')} placeholder="Opcional" />
          </Field>
        </>
      )}

      <div className="sm:col-span-2">
        <FormError message={errors.root?.message} />
      </div>

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : `Registrar ${MOVEMENT_TYPES[type].label.toLowerCase()}`}
        </Button>
      </div>
    </form>
  )
}
