<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'weekday', 'start_time', 'end_time'])]
class VetSchedule extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
        ];
    }

    public function veterinarian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
