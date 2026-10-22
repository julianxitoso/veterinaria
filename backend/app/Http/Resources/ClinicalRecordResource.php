<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicalRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pet_id' => $this->pet_id,
            'consultation_id' => $this->consultation_id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'recorded_at' => $this->recorded_at?->toIso8601String(),
            'next_date' => $this->next_date?->toDateString(),
            'archived_at' => $this->archived_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => ['id' => $this->author->id, 'name' => $this->author->name]),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
        ];
    }
}
