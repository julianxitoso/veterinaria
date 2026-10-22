<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'price', 'tax_rate', 'is_consultation', 'is_active'])]
class Service extends Model
{
    use BelongsToTenant;

    protected $attributes = [
        'is_active' => true,
        'is_consultation' => false,
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'is_consultation' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
