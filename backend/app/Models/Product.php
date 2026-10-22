<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'code', 'category', 'supplier', 'unit', 'cost', 'price',
    'tax_rate', 'min_stock', 'expires_at', 'notes', 'is_active',
])]
class Product extends Model
{
    use BelongsToTenant, HasFactory;

    /**
     * Días antes del vencimiento en que se alerta.
     */
    public const EXPIRY_WARNING_DAYS = 30;

    protected $attributes = [
        'is_active' => true,
        'stock' => 0,
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'stock' => 'decimal:2',
            'min_stock' => 'decimal:2',
            'expires_at' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->min_stock > 0 && $this->stock <= $this->min_stock;
    }

    /**
     * expired | expiring | null
     */
    public function expiryStatus(): ?string
    {
        if (! $this->expires_at || $this->stock <= 0) {
            return null;
        }

        return match (true) {
            $this->expires_at->lt(today()) => 'expired',
            $this->expires_at->lte(today()->addDays(self::EXPIRY_WARNING_DAYS)) => 'expiring',
            default => null,
        };
    }

    public function scopeSearch(Builder $query, ?string $term): void
    {
        if (blank($term)) {
            return;
        }

        $like = '%'.trim($term).'%';

        $query->where(fn (Builder $q) => $q
            ->where('name', 'like', $like)
            ->orWhere('code', 'like', $like)
            ->orWhere('supplier', 'like', $like));
    }

    public function scopeLowStock(Builder $query): void
    {
        $query->where('min_stock', '>', 0)->whereColumn('stock', '<=', 'min_stock');
    }

    /**
     * Con existencias y vencidos o por vencer.
     */
    public function scopeExpiring(Builder $query): void
    {
        $query->where('stock', '>', 0)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '<=', today()->addDays(self::EXPIRY_WARNING_DAYS));
    }
}
