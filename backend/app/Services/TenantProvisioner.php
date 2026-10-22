<?php

namespace App\Services;

use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Da de alta una clínica nueva: crea el tenant, sus roles base y el
 * usuario administrador inicial.
 */
class TenantProvisioner
{
    /**
     * Permisos globales de la plataforma, agrupados por módulo.
     */
    public const PERMISSIONS = [
        'pacientes' => ['ver', 'crear', 'editar', 'eliminar'],
        'consultas' => ['ver', 'crear', 'editar'],
        'citas' => ['ver', 'crear', 'editar'],
        'inventario' => ['ver', 'crear', 'editar', 'mover-stock'],
        'facturas' => ['ver', 'crear', 'cerrar'],
        'configuracion' => ['ver', 'editar'],
        'usuarios' => ['ver', 'crear', 'editar'],
    ];

    /**
     * Roles base de cada clínica. '*' = todos los permisos.
     */
    public const ROLES = [
        'administrador' => ['*'],
        'veterinario' => [
            'pacientes.ver', 'pacientes.crear', 'pacientes.editar',
            'consultas.ver', 'consultas.crear', 'consultas.editar',
            'citas.ver', 'citas.crear', 'citas.editar',
            'inventario.ver', 'facturas.ver',
        ],
        'recepcionista' => [
            'pacientes.ver', 'pacientes.crear', 'pacientes.editar',
            'consultas.ver',
            'citas.ver', 'citas.crear', 'citas.editar',
            'facturas.ver', 'facturas.crear',
        ],
        'asistente' => [
            'pacientes.ver', 'pacientes.crear', 'pacientes.editar',
            'consultas.ver',
            'citas.ver', 'citas.crear', 'citas.editar',
            'inventario.ver',
        ],
        'contador' => [
            'pacientes.ver',
            'inventario.ver',
            'facturas.ver', 'facturas.crear', 'facturas.cerrar',
            'configuracion.ver',
        ],
    ];

    public function __construct(private TenantManager $tenants) {}

    /**
     * Crea (o actualiza) los permisos globales.
     */
    public function syncPermissions(): void
    {
        foreach (self::PERMISSIONS as $module => $actions) {
            foreach ($actions as $action) {
                Permission::findOrCreate("{$module}.{$action}", 'web');
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * @param  array{name: string, slug: string}  $data  datos del tenant
     * @param  array{name: string, email: string, password: string}  $admin
     */
    public function create(array $data, array $admin): Tenant
    {
        return DB::transaction(function () use ($data, $admin) {
            $this->syncPermissions();

            $tenant = Tenant::create($data);

            $this->tenants->runAs($tenant, function () use ($tenant, $admin) {
                $this->createRoles();
                $this->createDefaultServices();

                User::create([...$admin, 'tenant_id' => $tenant->id])
                    ->assignRole('administrador');
            });

            return $tenant;
        });
    }

    /**
     * Servicios iniciales; la clínica ajusta precios desde Facturación.
     */
    private function createDefaultServices(): void
    {
        $services = [
            ['name' => 'Consulta general', 'price' => 50000, 'is_consultation' => true],
            ['name' => 'Consulta de control', 'price' => 30000],
            ['name' => 'Aplicación de vacuna', 'price' => 10000],
            ['name' => 'Desparasitación', 'price' => 8000],
            ['name' => 'Curación', 'price' => 25000],
        ];

        foreach ($services as $service) {
            Service::create([...$service, 'tax_rate' => 0]);
        }
    }

    private function createRoles(): void
    {
        $all = Permission::where('guard_name', 'web')->pluck('name')->all();

        foreach (self::ROLES as $name => $permissions) {
            Role::findOrCreate($name, 'web')
                ->syncPermissions($permissions === ['*'] ? $all : $permissions);
        }
    }
}
