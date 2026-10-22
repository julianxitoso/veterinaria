<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'stock_after' => $this->stock_after,
            'unit_cost' => $this->unit_cost,
            'reason' => $this->reason,
            'reference' => $this->reference,
            'lot' => $this->lot,
            'expires_at' => $this->expires_at?->toDateString(),
            'user' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->name]),
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'unit' => $this->product->unit,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
