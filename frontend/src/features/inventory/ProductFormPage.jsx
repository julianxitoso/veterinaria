import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import { Checkbox, Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { createProduct, getProduct, getProductOptions, updateProduct } from '../../services/inventoryService'
import { applyServerErrors, emptyToNull } from '../../utils/apiErrors'
import { formatMoney } from '../../utils/format'
import { TAX_RATES } from './inventoryLabels'

const toNumber = (v) => Number(String(v ?? '').replace(',', '.'))
const number = (label, { required = true } = {}) =>
  yup.string().test('number', `${label} inválido`, (v) => (!v && !required) || (v !== '' && !isNaN(toNumber(v)) && toNumber(v) >= 0))

const schema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio'),
  code: yup.string().trim().max(50),
  category: yup.string().trim(),
  supplier: yup.string().trim(),
  unit: yup.string().trim().required('La unidad es obligatoria'),
  cost: number('Costo'),
  price: number('Precio'),
  tax_rate: yup.string().required(),
  min_stock: number('Stock mínimo'),
  initial_stock: number('Stock inicial', { required: false }),
  expires_at: yup.string(),
  notes: yup.string(),
  is_active: yup.boolean(),
})

const NUMERIC = ['cost', 'price', 'tax_rate', 'min_stock', 'initial_stock']
const emptyValues = {
  name: '', code: '', category: '', supplier: '', unit: 'unidad', cost: '', price: '', tax_rate: '0',
  min_stock: '0', initial_stock: '', expires_at: '', notes: '', is_active: true,
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const productQuery = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id), enabled: isEdit })
  const { data: options } = useQuery({ queryKey: ['product-options'], queryFn: getProductOptions, staleTime: 5 * 60_000 })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  const [cost, price] = useWatch({ control, name: ['cost', 'price'] })
  const margin = toNumber(cost) > 0 && toNumber(price) > 0 ? ((toNumber(price) - toNumber(cost)) / toNumber(price)) * 100 : null

  useEffect(() => {
    const p = productQuery.data
    if (!p) return
    reset({
      ...Object.fromEntries(Object.keys(emptyValues).map((k) => [k, p[k] == null ? '' : String(p[k])])),
      tax_rate: String(Number(p.tax_rate)),
      cost: String(Number(p.cost)),
      price: String(Number(p.price)),
      min_stock: String(Number(p.min_stock)),
      initial_stock: '',
      is_active: p.is_active,
    })
  }, [productQuery.data, reset])

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? updateProduct(id, values) : createProduct(values)),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['product-options'] })
      queryClient.invalidateQueries({ queryKey: ['product', String(product.id)] })
      navigate(`/inventario/${product.id}`, { replace: isEdit })
    },
  })

  const onSubmit = (values) => {
    const payload = emptyToNull({
      ...values,
      ...Object.fromEntries(NUMERIC.map((k) => [k, values[k] === '' ? '' : toNumber(values[k])])),
    })
    if (isEdit) delete payload.initial_stock
    return mutation.mutateAsync(payload).catch((error) => applyServerErrors(error, setError))
  }

  if (isEdit && productQuery.isPending) return <Spinner />
  if (isEdit && productQuery.error) return <ErrorState error={productQuery.error} />

  const err = (name) => errors[name]?.message

  return (
    <div className="max-w-3xl">
      <PageHeader title={isEdit ? 'Editar producto' : 'Nuevo producto'} back={isEdit ? `/inventario/${id}` : '/inventario'} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required error={err('name')} className="sm:col-span-2">
              <Input {...register('name')} placeholder="Ej. Meloxicam 2 mg" autoFocus={!isEdit} />
            </Field>
            <Field label="Código" error={err('code')}>
              <Input {...register('code')} placeholder="Interno o de barras" />
            </Field>
            <Field label="Unidad" required error={err('unit')}>
              <Input list="units-list" {...register('unit')} />
            </Field>
            <Field label="Categoría" error={err('category')}>
              <Input list="categories-list" {...register('category')} placeholder="Ej. Medicamentos" />
            </Field>
            <Field label="Proveedor" error={err('supplier')}>
              <Input list="suppliers-list" {...register('supplier')} />
            </Field>
          </div>
        </Card>

        <Card title="Precios">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Costo de compra" required error={err('cost')}>
              <Input inputMode="decimal" {...register('cost')} placeholder="0" />
            </Field>
            <Field label="Precio de venta" required error={err('price')}>
              <Input inputMode="decimal" {...register('price')} placeholder="0" />
            </Field>
            <Field label="IVA" error={err('tax_rate')}>
              <Select {...register('tax_rate')}>
                {TAX_RATES.map((t) => <option key={t} value={t}>{t === 0 ? 'Exento (0%)' : `${t}%`}</option>)}
              </Select>
            </Field>
          </div>
          {margin !== null && (
            <p className={`mt-3 text-sm ${margin < 0 ? 'text-red-600' : 'text-muted'}`}>
              Margen: <span className="font-medium">{margin.toFixed(0)}%</span> · Ganancia por {''}
              unidad: {formatMoney(toNumber(price) - toNumber(cost))}
            </p>
          )}
        </Card>

        <Card title="Existencias">
          <div className="grid gap-4 sm:grid-cols-3">
            {!isEdit && (
              <Field label="Stock inicial" error={err('initial_stock')}>
                <Input inputMode="decimal" {...register('initial_stock')} placeholder="0" />
              </Field>
            )}
            <Field label="Stock mínimo (alerta)" required error={err('min_stock')}>
              <Input inputMode="decimal" {...register('min_stock')} />
            </Field>
            <Field label="Próximo vencimiento" error={err('expires_at')}>
              <Input type="date" {...register('expires_at')} />
            </Field>
          </div>
          {isEdit && (
            <p className="mt-3 text-xs text-muted">
              El stock se modifica con movimientos (entradas, salidas o ajustes) desde la ficha del producto.
            </p>
          )}
        </Card>

        <Card>
          <div className="space-y-4">
            <Field label="Notas" error={err('notes')}>
              <Textarea rows={2} {...register('notes')} />
            </Field>
            {isEdit && <Checkbox label="Producto activo (desmarcar para ocultarlo sin perder su historial)" {...register('is_active')} />}
          </div>
        </Card>

        <datalist id="units-list">{options?.units.map((u) => <option key={u} value={u} />)}</datalist>
        <datalist id="categories-list">{options?.categories.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="suppliers-list">{options?.suppliers.map((s) => <option key={s} value={s} />)}</datalist>

        <FormError message={errors.root?.message} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </div>
  )
}
