<?php

namespace App\Tenancy;

use App\Models\Tenant;

/**
 * Mantiene la clínica (tenant) activa durante la petición actual.
 */
class TenantManager
{
    private ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;

        // los roles de spatie/permission se filtran por tenant_id
        setPermissionsTeamId($tenant?->id);
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    public function check(): bool
    {
        return $this->tenant !== null;
    }

    /**
     * Ejecuta un callback en el contexto de otra clínica y restaura la actual.
     */
    public function runAs(Tenant $tenant, callable $callback): mixed
    {
        $previous = $this->tenant;
        $this->set($tenant);

        try {
            return $callback();
        } finally {
            $this->set($previous);
        }
    }
}
