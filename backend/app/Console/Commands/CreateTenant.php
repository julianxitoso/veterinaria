<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\TenantProvisioner;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

class CreateTenant extends Command
{
    protected $signature = 'tenant:create';

    protected $description = 'Da de alta una nueva clínica con su usuario administrador';

    public function handle(TenantProvisioner $provisioner): int
    {
        $name = text('Nombre de la clínica', required: true);

        $slug = text(
            'Subdominio',
            default: Str::slug($name),
            required: true,
            validate: fn (string $value) => match (true) {
                ! preg_match('/^[a-z0-9-]+$/', $value) => 'Solo minúsculas, números y guiones.',
                Tenant::where('slug', $value)->exists() => 'Ese subdominio ya existe.',
                default => null,
            },
        );

        $adminName = text('Nombre del administrador', required: true);
        $adminEmail = text('Email del administrador', required: true, validate: fn ($v) => filter_var($v, FILTER_VALIDATE_EMAIL) ? null : 'Email inválido.');
        $adminPassword = password('Contraseña del administrador', required: true, validate: fn ($v) => strlen($v) < 8 ? 'Mínimo 8 caracteres.' : null);

        $tenant = $provisioner->create(
            ['name' => $name, 'slug' => $slug],
            ['name' => $adminName, 'email' => $adminEmail, 'password' => $adminPassword],
        );

        $this->components->info("Clínica creada: {$tenant->slug}.".config('tenancy.central_domain'));

        return self::SUCCESS;
    }
}
