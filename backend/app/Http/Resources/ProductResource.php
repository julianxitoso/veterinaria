<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category,
            'supplier' => $this->supplier,
            'unit' => $this->unit,
            'cost' => $this->cost,
            'price' => $this->price,
            'tax_rate' => $this->tax_rate,
            'stock' => $this->stock,
            'min_stock' => $this->min_stock,
            'expires_at' => $this->expires_at?->toDateString(),
            'notes' => $this->notes,
            'is_active' => $this->is_active,
            'is_low_stock' => $this->isLowStock(),
            'expiry_status' => $this->expiryStatus(),
            'movements' => MovementResource::collection($this->whenLoaded('movements')),
        ];
    }
}
