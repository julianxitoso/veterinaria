import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Checkbox, Field, FormError, Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { listServices, saveService } from '../../services/billingService'
import { formatMoney } from '../../utils/format'
import { TAX_RATES } from '../inventory/inventoryLabels'

const emptyService = { name: '', price: '', tax_rate: 0, is_consultation: false, is_active: true }

/**
 * Catálogo de servicios cobrables (consulta, vacunación, cirugía…).
 */
export default function ServicesPage() {
  const queryClient = useQueryClient()
  const canEdit = useCan('configuracion.editar')
  const [editing, setEditing] = useState(null)

  const { data: services, isPending } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: () => listServices({ include_inactive: 1 }),
  })

  const onSaved = () => {
    setEditing(null)
    queryClient.invalidateQueries({ queryKey: ['services'] })
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Servicios"
        subtitle="Lo que la clínica cobra además de los productos"
        back="/facturas"
        actions={canEdit && !editing && <Button icon={Plus} onClick={() => setEditing(emptyService)}>Nuevo servicio</Button>}
      />

      {editing && (
        <div className="mb-5">
          <ServiceForm key={editing.id ?? 'new'} service={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
        </div>
      )}

      <Card flush>
        {isPending ? (
          <Spinner />
        ) : services.length === 0 ? (
          <EmptyState>No hay servicios.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {services.map((s) => (
              <li key={s.id} className={`flex items-center justify-between gap-3 px-5 py-3 ${s.is_active ? '' : 'opacity-50'}`}>
                <div>
                  <p className="font-medium">
                    {s.name}
                    {s.is_consultation && (
                      <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-normal text-brand-dark">Se cobra al facturar consultas</span>
                    )}
                    {!s.is_active && <span className="ml-2 text-xs font-normal text-muted">(inactivo)</span>}
                  </p>
                  <p className="text-sm text-muted">{formatMoney(s.price)} · IVA {Number(s.tax_rate)}%</p>
                </div>
                {canEdit && (
                  <button type="button" className="text-sm text-brand-dark hover:underline" onClick={() => setEditing(s)}>Editar</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ServiceForm({ service, onSaved, onCancel }) {
  const [values, setValues] = useState({
    ...service,
    price: service.price === '' ? '' : String(Number(service.price)),
    tax_rate: String(Number(service.tax_rate)),
  })
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const mutation = useMutation({
    mutationFn: () => saveService({ ...values, price: Number(String(values.price).replace(',', '.')), tax_rate: Number(values.tax_rate) }),
    onSuccess: onSaved,
  })

  const error = mutation.error?.response?.data
  const fieldError = (f) => error?.errors?.[f]?.[0]

  return (
    <Card title={service.id ? 'Editar servicio' : 'Nuevo servicio'}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nombre" required error={fieldError('name')} className="sm:col-span-3">
          <Input value={values.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Precio" required error={fieldError('price')}>
          <Input inputMode="decimal" value={values.price} onChange={set('price')} />
        </Field>
        <Field label="IVA" error={fieldError('tax_rate')}>
          <Select value={values.tax_rate} onChange={set('tax_rate')}>
            {TAX_RATES.map((t) => <option key={t} value={t}>{t === 0 ? 'Exento (0%)' : `${t}%`}</option>)}
          </Select>
        </Field>
        <div className="space-y-2 sm:col-span-3">
          <Checkbox label="Agregarlo automáticamente al facturar una consulta" checked={values.is_consultation} onChange={set('is_consultation')} />
          <Checkbox label="Activo" checked={values.is_active} onChange={set('is_active')} />
        </div>
      </div>
      {error && !error.errors && <div className="mt-3"><FormError message={error.message} /></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Guardar</Button>
      </div>
    </Card>
  )
}
