import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, FileText, Package, Pencil, Receipt, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Select } from '../../components/ui/Form'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Modal from '../../components/ui/Modal'
import { useCan } from '../../hooks/useCan'
import { addPayment, deleteInvoice, getInvoice, issueInvoice, voidInvoice } from '../../services/billingService'
import { formatDateTime, formatMoney, formatQty } from '../../utils/format'
import { openPdf } from '../../utils/pdf'
import { INVOICE_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from './billingLabels'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialog, setDialog] = useState(searchParams.get('emitir') ? 'issue' : null)
  const canCreate = useCan('facturas.crear')
  const canVoid = useCan('facturas.cerrar')

  const queryKey = ['invoice', id]
  const { data: inv, isPending, error } = useQuery({ queryKey, queryFn: () => getInvoice(id) })

  const onUpdated = (updated) => {
    queryClient.setQueryData(queryKey, updated)
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    // emitir/anular mueve stock y puede finalizar la consulta
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
    if (updated.consultation_id) queryClient.invalidateQueries({ queryKey: ['consultation', String(updated.consultation_id)] })
    closeDialog()
  }

  const closeDialog = () => {
    setDialog(null)
    if (searchParams.get('emitir')) setSearchParams({}, { replace: true })
  }

  const removal = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/facturas', { replace: true })
    },
  })

  if (isPending) return <Spinner />
  if (error) return <ErrorState error={error} />

  const isDraft = inv.status === 'draft'
  const isIssued = inv.status === 'issued'

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={inv.number ? `Factura ${inv.number}` : 'Borrador de factura'}
        subtitle={inv.issued_at ? `Emitida el ${formatDateTime(inv.issued_at)}` : `Creado el ${formatDateTime(inv.created_at)}`}
        back="/facturas"
        actions={
          <>
            <Button variant="secondary" icon={FileText} onClick={() => openPdf(`/invoices/${id}/pdf`)}>PDF</Button>
            {isDraft && canCreate && (
              <>
                <Button
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => confirm('¿Eliminar este borrador?') && removal.mutate()}
                >
                  Eliminar
                </Button>
                <Button variant="secondary" icon={Pencil} to={`/facturas/${id}/editar`}>Editar</Button>
                <Button icon={Receipt} onClick={() => setDialog('issue')}>Emitir factura</Button>
              </>
            )}
            {isIssued && canCreate && inv.balance > 0 && <Button icon={Banknote} onClick={() => setDialog('payment')}>Registrar pago</Button>}
            {isIssued && canVoid && <Button variant="ghost" className="text-red-600" onClick={() => setDialog('void')}>Anular</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge status={INVOICE_STATUS[inv.status]} />
        {inv.payment_status && <Badge status={PAYMENT_STATUS[inv.payment_status]} />}
      </div>

      {inv.status === 'voided' && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Anulada el {formatDateTime(inv.voided_at)}: {inv.void_reason}. Los productos volvieron al inventario.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Cliente</p>
                <Link to={`/clientes/${inv.client.id}`} className="font-medium text-brand-dark hover:underline">{inv.client.name}</Link>
                <p className="text-muted">{[inv.client.document && `${inv.client.document_type} ${inv.client.document}`, inv.client.phone].filter(Boolean).join(' · ')}</p>
              </div>
              <div>
                {inv.pet && (
                  <>
                    <p className="text-xs text-muted">Mascota</p>
                    <Link to={`/pacientes/${inv.pet.id}`} className="font-medium text-brand-dark hover:underline">{inv.pet.name}</Link>
                  </>
                )}
                {inv.consultation_id && (
                  <p className="mt-1">
                    <Link to={`/consultas/${inv.consultation_id}`} className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
                      <Stethoscope className="size-3.5" /> Ver consulta
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card flush title="Detalle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 text-right font-medium">Cant.</th>
                    <th className="px-4 py-2 text-right font-medium">Precio</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Dto.</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">IVA</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {inv.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          {item.type === 'product' ? <Package className="size-4 text-stone-400" /> : <Stethoscope className="size-4 text-stone-400" />}
                          {item.description}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{formatQty(item.quantity)}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(item.unit_price)}</td>
                      <td className="hidden px-4 py-2 text-right sm:table-cell">{Number(item.discount_pct) > 0 ? `${formatQty(item.discount_pct)}%` : '—'}</td>
                      <td className="hidden px-4 py-2 text-right sm:table-cell">{formatQty(item.tax_rate)}%</td>
                      <td className="px-4 py-2 text-right font-medium">{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {inv.notes && (
            <Card title="Observaciones"><p className="whitespace-pre-line text-sm">{inv.notes}</p></Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <dl className="space-y-1 text-sm">
              <Row label="Subtotal" value={formatMoney(inv.subtotal)} />
              {Number(inv.discount_total) > 0 && <Row label="Descuento" value={`-${formatMoney(inv.discount_total)}`} />}
              <Row label="IVA" value={formatMoney(inv.tax_total)} />
              <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold">
                <dt>Total</dt><dd>{formatMoney(inv.total)}</dd>
              </div>
              {isIssued && (
                <>
                  <Row label="Pagado" value={formatMoney(inv.paid_total)} />
                  <div className={`flex justify-between font-semibold ${inv.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    <dt>Saldo</dt><dd>{formatMoney(inv.balance)}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>

          {inv.payments.length > 0 && (
            <Card title="Pagos">
              <ul className="space-y-2 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>
                      {PAYMENT_METHODS[p.method]}
                      <span className="block text-xs text-muted">
                        {formatDateTime(p.paid_at)}{p.reference && ` · ${p.reference}`} · {p.user?.name}
                      </span>
                    </span>
                    <span className="font-medium">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {dialog === 'issue' && <IssueDialog invoice={inv} onClose={closeDialog} onDone={onUpdated} />}
      {dialog === 'payment' && <PaymentDialog invoice={inv} onClose={closeDialog} onDone={onUpdated} />}
      {dialog === 'void' && <VoidDialog invoice={inv} onClose={closeDialog} onDone={onUpdated} />}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-stone-600"><dt>{label}</dt><dd>{value}</dd></div>
  )
}

/**
 * Campos de pago reutilizados al emitir y al abonar.
 */
function PaymentFields({ amount, setAmount, method, setMethod, reference, setReference, max }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Valor recibido">
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <span className="mt-1 flex gap-2 text-xs">
          <button type="button" className="text-brand-dark hover:underline" onClick={() => setAmount(String(max))}>Total ({formatMoney(max)})</button>
        </span>
      </Field>
      <Field label="Forma de pago">
        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
          {Object.entries(PAYMENT_METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </Select>
      </Field>
      {method !== 'cash' && (
        <Field label="Referencia / comprobante" className="sm:col-span-2">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      )}
    </div>
  )
}

function usePaymentState(initialAmount) {
  const [amount, setAmount] = useState(String(initialAmount))
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  return { amount, setAmount, method, setMethod, reference, setReference }
}

function serverMessage(error) {
  const errors = error?.response?.data?.errors
  return (errors && Object.values(errors)[0]?.[0]) ?? error?.response?.data?.message ?? 'No se pudo completar la operación.'
}

function IssueDialog({ invoice, onClose, onDone }) {
  const [charge, setCharge] = useState(true)
  const payment = usePaymentState(Number(invoice.total))

  const mutation = useMutation({
    mutationFn: () =>
      issueInvoice(
        invoice.id,
        charge && Number(payment.amount) > 0
          ? { amount: Number(String(payment.amount).replace(',', '.')), method: payment.method, reference: payment.reference || null }
          : null,
      ),
    onSuccess: onDone,
  })

  return (
    <Modal title="Emitir factura" onClose={onClose}>
      <p className="text-sm text-stone-600">
        Total a facturar: <strong className="text-lg text-ink">{formatMoney(invoice.total)}</strong>
      </p>
      <ul className="mt-2 list-inside list-disc text-xs text-muted">
        <li>Se asignará el número consecutivo.</li>
        {invoice.items.some((i) => i.type === 'product') && <li>Se descontarán los productos del inventario.</li>}
        {invoice.consultation_id && <li>La consulta quedará finalizada.</li>}
      </ul>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-brand" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
        Registrar el pago ahora
      </label>
      {charge && <div className="mt-3"><PaymentFields {...payment} max={Number(invoice.total)} /></div>}

      {mutation.error && <div className="mt-3"><FormError message={serverMessage(mutation.error)} /></div>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Emitiendo…' : 'Emitir'}
        </Button>
      </div>
    </Modal>
  )
}

function PaymentDialog({ invoice, onClose, onDone }) {
  const payment = usePaymentState(invoice.balance)

  const mutation = useMutation({
    mutationFn: () =>
      addPayment(invoice.id, {
        amount: Number(String(payment.amount).replace(',', '.')),
        method: payment.method,
        reference: payment.reference || null,
      }),
    onSuccess: onDone,
  })

  return (
    <Modal title="Registrar pago" onClose={onClose}>
      <p className="mb-3 text-sm text-stone-600">Saldo pendiente: <strong>{formatMoney(invoice.balance)}</strong></p>
      <PaymentFields {...payment} max={invoice.balance} />
      {mutation.error && <div className="mt-3"><FormError message={serverMessage(mutation.error)} /></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Registrar</Button>
      </div>
    </Modal>
  )
}

function VoidDialog({ invoice, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const mutation = useMutation({ mutationFn: () => voidInvoice(invoice.id, reason), onSuccess: onDone })

  return (
    <Modal title={`Anular factura ${invoice.number}`} onClose={onClose}>
      <p className="text-sm text-stone-600">
        La factura quedará anulada (no se elimina) y los productos vendidos volverán al inventario.
        {Number(invoice.paid_total) > 0 && ' Los pagos registrados se conservan: gestiona la devolución al cliente por fuera.'}
      </p>
      <Field label="Motivo de la anulación" required className="mt-3">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </Field>
      {mutation.error && <div className="mt-3"><FormError message={serverMessage(mutation.error)} /></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}>Anular factura</Button>
      </div>
    </Modal>
  )
}
