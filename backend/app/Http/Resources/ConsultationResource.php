<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConsultationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pet_id' => $this->pet_id,
            'pet' => new PetResource($this->whenLoaded('pet')),
            'veterinarian' => $this->whenLoaded('veterinarian', fn () => [
                'id' => $this->veterinarian->id,
                'name' => $this->veterinarian->name,
            ]),
            'consulted_at' => $this->consulted_at?->toIso8601String(),
            'reason' => $this->reason,
            'anamnesis' => $this->anamnesis,
            'weight' => $this->weight,
            'temperature' => $this->temperature,
            'heart_rate' => $this->heart_rate,
            'respiratory_rate' => $this->respiratory_rate,
            'physical_exam' => $this->physical_exam,
            'diagnosis' => $this->diagnosis,
            'treatment' => $this->treatment,
            'instructions' => $this->instructions,
            'observations' => $this->observations,
            'follow_up_date' => $this->follow_up_date?->toDateString(),
            'status' => $this->status,
            'closed_at' => $this->closed_at?->toIso8601String(),
            'medications' => $this->whenLoaded('medications', fn () => $this->medications->map(fn ($m) => [
                ...$m->only(['id', 'product_id', 'name', 'dose', 'frequency', 'duration', 'route', 'notes', 'dispense', 'quantity']),
                'product' => $m->relationLoaded('product') && $m->product ? [
                    'id' => $m->product->id,
                    'name' => $m->product->name,
                    'unit' => $m->product->unit,
                    'price' => $m->product->price,
                    'stock' => $m->product->stock,
                ] : null,
            ])),
            'exams' => ExamResource::collection($this->whenLoaded('exams')),
            'records' => ClinicalRecordResource::collection($this->whenLoaded('records')),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'invoice' => $this->whenLoaded('invoice', fn () => $this->invoice ? [
                'id' => $this->invoice->id,
                'number' => $this->invoice->number,
                'status' => $this->invoice->status,
                'payment_status' => $this->invoice->paymentStatus(),
                'total' => $this->invoice->total,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
