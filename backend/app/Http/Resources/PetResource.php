<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'name' => $this->name,
            'species' => $this->species,
            'breed' => $this->breed,
            'sex' => $this->sex,
            'is_sterilized' => $this->is_sterilized,
            'birth_date' => $this->birth_date?->toDateString(),
            'age' => $this->age,
            'weight' => $this->weight,
            'color' => $this->color,
            'microchip' => $this->microchip,
            'photo_url' => $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null,
            'allergies' => $this->allergies,
            'notes' => $this->notes,
            'deceased_at' => $this->deceased_at?->toDateString(),
            'client' => new ClientResource($this->whenLoaded('client')),
            'created_at' => $this->created_at,
        ];
    }
}
