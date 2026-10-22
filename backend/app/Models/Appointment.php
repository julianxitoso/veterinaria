<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'client_id', 'pet_id', 'consultation_id', 'created_by', 'starts_at', 'ends_at',
    'reason', 'notes', 'status', 'source', 'cancel_reason',
    'contact_name', 'contact_phone', 'contact_email', 'contact_document', 'pet_name', 'pet_species',
])]
class Appointment extends Model
{
    use BelongsToTenant;

    public const REQUESTED = 'requested';

    public const CONFIRMED = 'confirmed';

    public const ATTENDED = 'attended';

    public const CANCELLED = 'cancelled';

    public const NO_SHOW = 'no_show';

    /**
     * Estados que ocupan el horario del veterinario.
     */
    public const ACTIVE = [self::REQUESTED, self::CONFIRMED, self::ATTENDED];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function veterinarian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class)->withTrashed();
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereIn('status', self::ACTIVE);
    }

    /**
     * Citas que se cruzan con el intervalo [start, end).
     */
    public function scopeOverlapping(Builder $query, $start, $end): void
    {
        $query->where('starts_at', '<', $end)->where('ends_at', '>', $start);
    }
}
