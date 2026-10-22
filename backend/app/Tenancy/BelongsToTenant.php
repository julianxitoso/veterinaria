<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aísla un modelo por clínica: filtra todas las consultas por el tenant
 * actual y asigna tenant_id automáticamente al crear registros.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenants = app(TenantManager::class);

            if ($tenants->check()) {
                $builder->where($builder->qualifyColumn('tenant_id'), $tenants->id());
            }
        });

        static::creating(function ($model) {
            $tenants = app(TenantManager::class);

            if (! $model->tenant_id && $tenants->check()) {
                $model->tenant_id = $tenants->id();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
