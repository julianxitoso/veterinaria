<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'veterinarian' => $this->whenLoaded('veterinarian', fn () => $this->veterinarian->only(['id', 'name'])),
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'name', 'phone', 'document'])),
            'pet' => $this->whenLoaded('pet', fn () => $this->pet?->only(['id', 'name', 'species', 'breed', 'allergies'])),
            'pet_id' => $this->pet_id,
            'client_id' => $this->client_id,
            'consultation_id' => $this->consultation_id,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'duration' => (int) $this->starts_at->diffInMinutes($this->ends_at),
            'reason' => $this->reason,
            'notes' => $this->notes,
            'status' => $this->status,
            'source' => $this->source,
            'cancel_reason' => $this->cancel_reason,
            // datos de contacto si aún no está vinculada a un cliente registrado
            'contact' => [
                'name' => $this->contact_name,
                'phone' => $this->contact_phone,
                'email' => $this->contact_email,
                'document' => $this->contact_document,
                'pet_name' => $this->pet_name,
                'pet_species' => $this->pet_species,
            ],
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->only(['id', 'name'])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
