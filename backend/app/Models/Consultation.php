<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'pet_id', 'user_id', 'consulted_at', 'reason', 'anamnesis',
    'weight', 'temperature', 'heart_rate', 'respiratory_rate', 'physical_exam',
    'diagnosis', 'treatment', 'instructions', 'observations', 'follow_up_date',
])]
class Consultation extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $attributes = [
        'status' => self::STATUS_OPEN,
    ];

    protected function casts(): array
    {
        return [
            'consulted_at' => 'datetime',
            'follow_up_date' => 'date',
            'closed_at' => 'datetime',
            'weight' => 'decimal:2',
            'temperature' => 'decimal:1',
            'heart_rate' => 'integer',
            'respiratory_rate' => 'integer',
        ];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class)->withTrashed();
    }

    public function veterinarian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function medications(): HasMany
    {
        return $this->hasMany(ConsultationMedication::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(ConsultationExam::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(ClinicalRecord::class);
    }

    /**
     * Factura vigente (no anulada) de la consulta.
     */
    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class)->where('status', '!=', Invoice::STATUS_VOIDED)->latest('id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    /**
     * Busca por motivo, diagnóstico, nombre de la mascota o nombre del dueño.
     */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        if (blank($term)) {
            return;
        }

        $like = '%'.trim($term).'%';

        $query->where(fn (Builder $q) => $q
            ->where('reason', 'like', $like)
            ->orWhere('diagnosis', 'like', $like)
            ->orWhereHas('pet', fn (Builder $p) => $p
                ->where('name', 'like', $like)
                ->orWhereHas('client', fn (Builder $c) => $c->where('name', 'like', $like))));
    }
}
