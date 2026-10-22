<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Model;

/**
 * Deja constancia de acciones críticas. Sin clínica activa (ej. comandos
 * de consola o seeders) no registra nada.
 */
class AuditLogger
{
    /**
     * Campos que nunca se guardan en el detalle de cambios.
     */
    private const HIDDEN = ['password', 'remember_token', 'updated_at', 'created_at'];

    public function __construct(private TenantManager $tenants) {}

    public function log(string $action, ?Model $subject, string $description, array $changes = [], ?User $user = null): void
    {
        if (! $this->tenants->check()) {
            return;
        }

        AuditLog::create([
            'tenant_id' => $this->tenants->id(),
            'user_id' => ($user ?? request()->user())?->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'changes' => $changes ?: null,
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Diferencias de un modelo recién actualizado: { campo: [antes, después] }.
     */
    public function diff(Model $model): array
    {
        return collect($model->getChanges())
            ->except(self::HIDDEN)
            // tras save() el "original" ya es el valor nuevo; el anterior está en getPrevious()
            ->mapWithKeys(fn ($new, $key) => [$key => [$model->getPrevious()[$key] ?? null, $new]])
            ->all();
    }
}
