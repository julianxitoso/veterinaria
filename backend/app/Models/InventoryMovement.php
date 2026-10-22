<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'product_id', 'user_id', 'type', 'quantity', 'stock_after', 'unit_cost',
    'reason', 'reference', 'source_type', 'source_id', 'lot', 'expires_at',
])]
class InventoryMovement extends Model
{
    use BelongsToTenant;

    public const TYPES = ['entry', 'exit', 'adjustment', 'sale'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'stock_after' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'expires_at' => 'date',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
