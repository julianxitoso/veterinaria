<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Pet;
use App\Models\Product;
use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reglas de facturación:
 *  - borrador: editable, sin número ni efecto en inventario
 *  - emitida: recibe consecutivo, descuenta stock y finaliza la consulta
 *  - anulada: devuelve el stock; nunca se elimina
 */
class InvoiceService
{
    public function __construct(
        private InventoryService $inventory,
        private ConsultationService $consultations,
        private TenantManager $tenants,
        private AuditLogger $audit,
    ) {}

    /**
     * Borrador a partir de una consulta: servicio de consulta + productos que el
     * cliente se lleva. Si ya hay un borrador para la consulta, lo devuelve.
     */
    public function fromConsultation(Consultation $consultation, User $user): Invoice
    {
        $existing = Invoice::where('consultation_id', $consultation->id)
            ->where('status', '!=', Invoice::STATUS_VOIDED)
            ->first();

        if ($existing?->isDraft()) {
            return $existing;
        }

        if ($existing) {
            throw ValidationException::withMessages([
                'consultation_id' => "Esta consulta ya tiene la factura {$existing->number}.",
            ]);
        }

        $items = [];

        if ($service = Service::where('is_active', true)->where('is_consultation', true)->orderBy('id')->first()) {
            $items[] = ['type' => 'service', 'service_id' => $service->id, 'quantity' => 1];
        }

        foreach ($consultation->medications()->where('dispense', true)->whereNotNull('product_id')->get() as $medication) {
            $items[] = [
                'type' => 'product',
                'product_id' => $medication->product_id,
                'consultation_medication_id' => $medication->id,
                'quantity' => (float) $medication->quantity,
            ];
        }

        $pet = Pet::withTrashed()->findOrFail($consultation->pet_id);

        return $this->createDraft([
            'client_id' => $pet->client_id,
            'pet_id' => $pet->id,
            'consultation_id' => $consultation->id,
            'items' => $items,
        ], $user);
    }

    public function createDraft(array $data, User $user): Invoice
    {
        return DB::transaction(function () use ($data, $user) {
            $invoice = Invoice::create([
                ...collect($data)->only(['client_id', 'pet_id', 'consultation_id', 'notes'])->all(),
                'user_id' => $user->id,
            ]);

            $this->replaceItems($invoice, $data['items'] ?? []);

            return $invoice;
        });
    }

    public function updateDraft(Invoice $invoice, array $data): Invoice
    {
        $this->ensureDraft($invoice);

        return DB::transaction(function () use ($invoice, $data) {
            $invoice->update(collect($data)->only(['client_id', 'pet_id', 'notes'])->all());
            $this->replaceItems($invoice, $data['items'] ?? []);

            return $invoice;
        });
    }

    public function deleteDraft(Invoice $invoice): void
    {
        $this->ensureDraft($invoice);
        $invoice->delete();
    }

    /**
     * Emite la factura: consecutivo, descuento de inventario, cierre de la
     * consulta y, opcionalmente, el pago en el mismo paso.
     *
     * @param  array{amount: float, method: string, reference?: string}|null  $payment
     */
    public function issue(Invoice $invoice, User $user, ?array $payment = null): Invoice
    {
        $this->ensureDraft($invoice);

        if (! $invoice->items()->exists()) {
            throw ValidationException::withMessages(['items' => 'La factura no tiene ítems.']);
        }

        return DB::transaction(function () use ($invoice, $user, $payment) {
            $invoice->forceFill([
                'number' => $this->nextNumber(),
                'status' => Invoice::STATUS_ISSUED,
                'issued_at' => now(),
            ])->save();

            // si algún producto no tiene stock suficiente, se revierte todo
            foreach ($invoice->items()->where('type', 'product')->with('product')->get() as $item) {
                $this->inventory->move($item->product, 'sale', (float) $item->quantity, $user, [
                    'reason' => "Venta factura {$invoice->number}",
                    'reference' => $invoice->number,
                    'source' => $invoice,
                ]);
            }

            $consultation = $invoice->consultation;
            if ($consultation?->isOpen()) {
                $this->consultations->close($consultation);
            }

            $this->audit->log('invoice.issued', $invoice, "Emitió la factura {$invoice->number} por \${$this->money($invoice->total)}", user: $user);

            if ($payment && (float) $payment['amount'] > 0) {
                $this->addPayment($invoice, $payment, $user);
            }

            return $invoice;
        });
    }

    public function addPayment(Invoice $invoice, array $data, User $user): Invoice
    {
        if (! $invoice->isIssued()) {
            throw ValidationException::withMessages(['amount' => 'Solo se registran pagos en facturas emitidas.']);
        }

        $amount = round((float) $data['amount'], 2);

        if ($amount > $invoice->balance() + 0.009) {
            throw ValidationException::withMessages([
                'amount' => 'El pago supera el saldo pendiente ($'.number_format($invoice->balance(), 0, ',', '.').').',
            ]);
        }

        return DB::transaction(function () use ($invoice, $data, $amount, $user) {
            $invoice->payments()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'paid_at' => $data['paid_at'] ?? now(),
            ]);

            $invoice->forceFill(['paid_total' => $invoice->payments()->sum('amount')])->save();

            $this->audit->log('invoice.payment', $invoice, "Registró pago de \${$this->money($amount)} ({$data['method']}) en la factura {$invoice->number}", user: $user);

            return $invoice;
        });
    }

    /**
     * Anula una factura emitida y devuelve al inventario lo vendido.
     */
    public function void(Invoice $invoice, string $reason, User $user): Invoice
    {
        if (! $invoice->isIssued()) {
            throw ValidationException::withMessages(['reason' => 'Solo se pueden anular facturas emitidas.']);
        }

        return DB::transaction(function () use ($invoice, $reason, $user) {
            foreach ($invoice->items()->where('type', 'product')->with('product')->get() as $item) {
                $this->inventory->move($item->product, 'entry', (float) $item->quantity, $user, [
                    'reason' => "Anulación factura {$invoice->number}",
                    'reference' => $invoice->number,
                    'source' => $invoice,
                ]);
            }

            $invoice->forceFill([
                'status' => Invoice::STATUS_VOIDED,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $this->audit->log('invoice.voided', $invoice, "Anuló la factura {$invoice->number}: {$reason}", user: $user);

            return $invoice;
        });
    }

    /**
     * Reemplaza los ítems y recalcula los totales. El IVA y la descripción
     * se toman del producto/servicio; el precio y el descuento son editables.
     */
    private function replaceItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();

        $totals = ['subtotal' => 0, 'discount_total' => 0, 'tax_total' => 0, 'total' => 0];

        foreach ($items as $item) {
            $source = match ($item['type']) {
                'product' => Product::findOrFail($item['product_id']),
                default => isset($item['service_id']) ? Service::findOrFail($item['service_id']) : null,
            };

            $quantity = (float) $item['quantity'];
            $unitPrice = (float) ($item['unit_price'] ?? $source?->price ?? 0);
            $discountPct = (float) ($item['discount_pct'] ?? 0);
            $taxRate = (float) ($source?->tax_rate ?? $item['tax_rate'] ?? 0);

            $gross = round($quantity * $unitPrice, 2);
            $subtotal = round($gross * (1 - $discountPct / 100), 2);
            $tax = round($subtotal * $taxRate / 100, 2);

            $invoice->items()->create([
                'type' => $item['type'],
                'product_id' => $item['type'] === 'product' ? $source->id : null,
                'service_id' => $item['type'] === 'service' ? $source?->id : null,
                'consultation_medication_id' => $item['consultation_medication_id'] ?? null,
                'description' => $item['description'] ?? $source?->name,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount_pct' => $discountPct,
                'tax_rate' => $taxRate,
                'subtotal' => $subtotal,
                'tax_amount' => $tax,
                'total' => $subtotal + $tax,
            ]);

            $totals['subtotal'] += $gross;
            $totals['discount_total'] += $gross - $subtotal;
            $totals['tax_total'] += $tax;
            $totals['total'] += $subtotal + $tax;
        }

        $invoice->forceFill(array_map(fn ($v) => round($v, 2), $totals))->save();
    }

    /**
     * Consecutivo por clínica, con bloqueo para que dos cajas no repitan número.
     */
    private function nextNumber(): string
    {
        $tenant = Tenant::whereKey($this->tenants->id())->lockForUpdate()->firstOrFail();

        $prefix = $tenant->setting('invoicing.prefix', 'FV-');
        $next = (int) $tenant->setting('invoicing.next_number', 1);

        $settings = $tenant->settings ?? [];
        data_set($settings, 'invoicing.next_number', $next + 1);
        $tenant->forceFill(['settings' => $settings])->save();

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function money(mixed $value): string
    {
        return number_format((float) $value, 0, ',', '.');
    }

    private function ensureDraft(Invoice $invoice): void
    {
        if (! $invoice->isDraft()) {
            throw ValidationException::withMessages([
                'status' => 'La factura ya fue emitida y no se puede modificar.',
            ]);
        }
    }
}
