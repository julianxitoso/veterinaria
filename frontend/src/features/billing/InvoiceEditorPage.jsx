import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Receipt, Save, Stethoscope, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { createInvoice, getInvoice, listServices, updateInvoice } from '../../services/billingService'
import { getClient } from '../../services/clientsService'
import { applyServerErrors } from '../../utils/apiErrors'
import { formatMoney, formatQty } from '../../utils/format'
import ClientPicker from '../clients/ClientPicker'
import MedicationNameInput from '../consultations/MedicationNameInput'
import { calcLine, calcTotals } from './billingLabels'

const toNumber = (v) => Number(String(v ?? '').replace(',', '.')) || 0

const itemFromApi = (i) => ({
  type: i.type,
  product_id: i.product_id,
  service_id: i.service_id,
  consultation_medication_id: i.consultation_medication_id,
  description: i.description,
  quantity: String(Number(i.quantity)),
  unit_price: String(Number(i.unit_price)),
  discount_pct: String(Number(i.discount_pct)),
  tax_rate: Number(i.tax_rate),
  stock: i.stock,
  unit: i.unit,
})

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // undefined = sin cambios (se usa el de la factura); null = quitado
  const [pickedClient, setPickedClient] = useState(undefined)
  const [productSearch, setProductSearch] = useState('')

  const invoiceQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => getInvoice(id), enabled: isEdit })
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: () => listServices() })

  const invoice = invoiceQuery.data
  const client = pickedClient !== undefined ? pickedClient : (invoice?.client ?? null)

  const { data: clientDetail } = useQuery({
    queryKey: ['client', String(client?.id)],
    queryFn: () => getClient(client.id),
    enabled: Boolean(client),
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { pet_id: '', notes: '', items: [] } })

  const items = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' })
  const totals = calcTotals(watchedItems ?? [])

  useEffect(() => {
    if (!invoice) return
    reset({ pet_id: invoice.pet_id ? String(invoice.pet_id) : '', notes: invoice.notes ?? '', items: invoice.items.map(itemFromApi) })
  }, [invoice, reset])

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? updateInvoice(id, payload) : createInvoice(payload)),
  })

  const save = async (values, thenIssue) => {
    if (!client) {
      setError('client_id', { message: 'Selecciona el cliente' })
      return
    }

    const payload = {
      client_id: client.id,
      pet_id: values.pet_id || null,
      notes: values.notes || null,
      items: values.items.map((i) => ({
        type: i.type,
        product_id: i.product_id ?? null,
        service_id: i.service_id ?? null,
        consultation_medication_id: i.consultation_medication_id ?? null,
        description: i.description || null,
        quantity: toNumber(i.quantity),
        unit_price: toNumber(i.unit_price),
        discount_pct: toNumber(i.discount_pct),
        tax_rate: i.tax_rate,
      })),
    }

    try {
      const saved = await mutation.mutateAsync(payload)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.setQueryData(['invoice', String(saved.id)], saved)
      navigate(`/facturas/${saved.id}${thenIssue ? '?emitir=1' : ''}`, { replace: true })
    } catch (error) {
      applyServerErrors(error, setError)
    }
  }

  if (isEdit && invoiceQuery.isPending) return <Spinner />
  if (isEdit && invoiceQuery.error) return <ErrorState error={invoiceQuery.error} />
  if (isEdit && invoice.status !== 'draft') return <Navigate to={`/facturas/${id}`} replace />

  const addService = (serviceId) => {
    const service = services.find((s) => String(s.id) === serviceId)
    if (!service) return
    items.append({
      type: 'service', service_id: service.id, description: service.name, quantity: '1',
      unit_price: String(Number(service.price)), discount_pct: '0', tax_rate: Number(service.tax_rate),
    })
  }

  const addProduct = (product) => {
    items.append({
      type: 'product', product_id: product.id, description: product.name, quantity: '1',
      unit_price: String(Number(product.price)), discount_pct: '0', tax_rate: Number(product.tax_rate),
      stock: product.stock, unit: product.unit,
    })
    setProductSearch('')
  }

  const addFreeLine = () =>
    items.append({ type: 'service', description: '', quantity: '1', unit_price: '', discount_pct: '0', tax_rate: 0 })

  const itemErrors = errors.items
  const lineError = (i, field) => itemErrors?.[i]?.[field]?.message ?? errors[`items.${i}.${field}`]?.message

  return (
    <div className="max-w-5xl pb-24">
      <PageHeader title={isEdit ? 'Editar borrador' : 'Nueva venta'} back={isEdit ? `/facturas/${id}` : '/facturas'} />

      <form onSubmit={handleSubmit((v) => save(v, false))} className="space-y-5" noValidate>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" required error={errors.client_id?.message}>
              <ClientPicker
                value={client}
                invalid={!!errors.client_id}
                onChange={(c) => {
                  setPickedClient(c)
                  setValue('pet_id', '')
                }}
              />
            </Field>
            <Field label="Mascota" error={errors.pet_id?.message}>
              <Select {...register('pet_id')} disabled={!clientDetail}>
                <option value="">— Sin mascota (venta de mostrador) —</option>
                {clientDetail?.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Detalle" flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="w-24 px-3 py-2 font-medium">Cant.</th>
                  <th className="w-32 px-3 py-2 font-medium">Precio</th>
                  <th className="w-20 px-3 py-2 font-medium">Dto. %</th>
                  <th className="w-16 px-3 py-2 text-right font-medium">IVA</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.fields.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Agrega servicios o productos.</td></tr>
                )}
                {items.fields.map((field, i) => {
                  const row = watchedItems?.[i] ?? field
                  const line = calcLine(row)
                  const isFree = row.type === 'service' && !row.service_id
                  const overStock = row.type === 'product' && row.stock != null && toNumber(row.quantity) > Number(row.stock)

                  return (
                    <tr key={field.id} className="align-top">
                      <td className="px-3 py-2">
                        {isFree ? (
                          <Input {...register(`items.${i}.description`)} placeholder="Descripción del servicio" />
                        ) : (
                          <p className="flex items-center gap-2 pt-2 font-medium">
                            {row.type === 'product' ? <Package className="size-4 text-stone-400" /> : <Stethoscope className="size-4 text-stone-400" />}
                            {row.description}
                          </p>
                        )}
                        {row.type === 'product' && row.stock != null && (
                          <p className={`text-xs ${overStock ? 'text-red-600' : 'text-stone-400'}`}>
                            Stock: {formatQty(row.stock)} {row.unit}{overStock && ' — insuficiente'}
                          </p>
                        )}
                        {lineError(i, 'description') && <p className="text-xs text-red-600">{lineError(i, 'description')}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <Input inputMode="decimal" {...register(`items.${i}.quantity`)} />
                        {lineError(i, 'quantity') && <p className="text-xs text-red-600">{lineError(i, 'quantity')}</p>}
                      </td>
                      <td className="px-3 py-2"><Input inputMode="decimal" {...register(`items.${i}.unit_price`)} /></td>
                      <td className="px-3 py-2"><Input inputMode="decimal" {...register(`items.${i}.discount_pct`)} /></td>
                      <td className="px-3 py-2 pt-4 text-right text-muted">{row.tax_rate}%</td>
                      <td className="whitespace-nowrap px-3 py-2 pt-4 text-right font-medium">{formatMoney(line.total)}</td>
                      <td className="px-1 py-2">
                        <button type="button" className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => items.remove(i)} aria-label="Quitar">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 border-t border-line p-4 md:grid-cols-3">
            <Select value="" onChange={(e) => addService(e.target.value)}>
              <option value="">+ Agregar servicio…</option>
              {services?.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatMoney(s.price)}</option>)}
            </Select>
            <MedicationNameInput value={productSearch} onChange={setProductSearch} onSelectProduct={addProduct} />
            <Button variant="secondary" icon={Plus} onClick={addFreeLine}>Línea libre</Button>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <Field label="Observaciones (salen en la factura)">
              <Textarea rows={3} {...register('notes')} />
            </Field>
          </Card>
          <Card>
            <dl className="space-y-1 text-sm">
              <TotalRow label="Subtotal" value={totals.subtotal} />
              {totals.discount > 0 && <TotalRow label="Descuento" value={-totals.discount} />}
              <TotalRow label="IVA" value={totals.tax} />
              <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(totals.total)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <FormError message={errors.root?.message ?? errors.items?.message} />

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/85 px-4 py-3 backdrop-blur-md md:left-64">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-2">
            <span className="mr-auto text-sm text-muted">
              <span className="hidden sm:inline">Total: </span>
              <strong className="tabular text-ink">{formatMoney(totals.total)}</strong>
            </span>
            <span className="hidden sm:contents">
              <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
            </span>
            <Button type="submit" variant="secondary" icon={Save} disabled={isSubmitting}>
              <span className="sm:hidden">Borrador</span>
              <span className="hidden sm:inline">Guardar borrador</span>
            </Button>
            <Button icon={Receipt} onClick={handleSubmit((v) => save(v, true))} disabled={isSubmitting || items.fields.length === 0}>
              Emitir<span className="hidden sm:inline">&nbsp;factura</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between text-stone-600">
      <dt>{label}</dt>
      <dd>{formatMoney(value)}</dd>
    </div>
  )
}
