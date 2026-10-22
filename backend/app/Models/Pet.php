<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'client_id', 'name', 'species', 'breed', 'sex', 'is_sterilized',
    'birth_date', 'weight', 'color', 'microchip', 'allergies', 'notes', 'deceased_at',
])]
class Pet extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const SEXES = ['male', 'female', 'unknown'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'deceased_at' => 'date',
            'weight' => 'decimal:2',
            'is_sterilized' => 'boolean',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class);
    }

    public function clinicalRecords(): HasMany
    {
        return $this->hasMany(ClinicalRecord::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * Edad legible, ej. "3 años", "5 meses", "12 días".
     */
    protected function age(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->birth_date) {
                return null;
            }

            $diff = $this->birth_date->diff($this->deceased_at ?? now());

            return match (true) {
                $diff->y > 0 => $diff->y.' '.($diff->y === 1 ? 'año' : 'años'),
                $diff->m > 0 => $diff->m.' '.($diff->m === 1 ? 'mes' : 'meses'),
                default => $diff->d.' '.($diff->d === 1 ? 'día' : 'días'),
            };
        });
    }

    /**
     * Busca por nombre, microchip o por nombre, documento o teléfono del dueño.
     */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        if (blank($term)) {
            return;
        }

        $like = '%'.trim($term).'%';

        $query->where(fn (Builder $q) => $q
            ->where('name', 'like', $like)
            ->orWhere('microchip', 'like', $like)
            ->orWhereHas('client', fn (Builder $c) => $c
                ->where('name', 'like', $like)
                ->orWhere('document', 'like', $like)
                ->orWhere('phone', 'like', $like)));
    }
}
