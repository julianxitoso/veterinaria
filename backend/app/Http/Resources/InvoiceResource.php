<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'payment_status' => $this->paymentStatus(),
            'issued_at' => $this->issued_at?->toIso8601String(),
            'client_id' => $this->client_id,
            'pet_id' => $this->pet_id,
            'consultation_id' => $this->consultation_id,
            'client' => $this->whenLoaded('client', fn () => $this->client->only(['id', 'name', 'document_type', 'document', 'phone', 'email'])),
            'pet' => $this->whenLoaded('pet', fn () => $this->pet?->only(['id', 'name', 'species'])),
            'user' => $this->whenLoaded('user', fn () => $this->user->only(['id', 'name'])),
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'tax_total' => $this->tax_total,
            'total' => $this->total,
            'paid_total' => $this->paid_total,
            'balance' => $this->balance(),
            'notes' => $this->notes,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'void_reason' => $this->void_reason,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                ...$i->only([
                    'id', 'type', 'product_id', 'service_id', 'consultation_medication_id', 'description',
                    'quantity', 'unit_price', 'discount_pct', 'tax_rate', 'subtotal', 'tax_amount', 'total',
                ]),
                'stock' => $i->relationLoaded('product') ? $i->product?->stock : null,
                'unit' => $i->relationLoaded('product') ? $i->product?->unit : null,
            ])),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($p) => [
                ...$p->only(['id', 'amount', 'method', 'reference']),
                'paid_at' => $p->paid_at->toIso8601String(),
                'user' => $p->user?->only(['id', 'name']),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
