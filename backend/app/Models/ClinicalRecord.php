<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Entrada de la historia clínica distinta a una consulta: evolución,
 * vacuna, desparasitación, procedimiento, resultado de examen o nota.
 */
#[Fillable(['pet_id', 'consultation_id', 'user_id', 'type', 'title', 'description', 'recorded_at', 'next_date'])]
class ClinicalRecord extends Model
{
    use BelongsToTenant, HasFactory;

    public const TYPES = ['evolution', 'vaccine', 'deworming', 'procedure', 'exam_result', 'note'];

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
            'next_date' => 'date',
            'archived_at' => 'datetime',
        ];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class)->withTrashed();
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereNull('archived_at');
    }
}
