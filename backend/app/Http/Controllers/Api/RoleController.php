<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Roles de la clínica y sus permisos. El rol "administrador" siempre
 * tiene todos los permisos para que nadie quede sin acceso.
 */
class RoleController extends Controller
{
    private const LOCKED_ROLE = 'administrador';

    public function __construct(private TenantManager $tenants, private AuditLogger $audit) {}

    public function index(): JsonResponse
    {
        $roles = Role::where('tenant_id', $this->tenants->id())
            ->with('permissions')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => $this->present($role));

        return response()->json([
            'data' => $roles,
            // catálogo de permisos agrupado por módulo
            'modules' => TenantProvisioner::PERMISSIONS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $name = Str::lower(trim($data['name']));

        if (Role::where('tenant_id', $this->tenants->id())->where('name', $name)->exists()) {
            throw ValidationException::withMessages(['name' => 'Ya existe un rol con ese nombre.']);
        }

        $role = Role::create(['name' => $name, 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions']);

        $this->audit->log('role.created', $role, "Creó el rol {$name}", ['permisos' => [null, $data['permissions']]]);

        return response()->json(['data' => $this->present($role->load('permissions'))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $role = Role::where('tenant_id', $this->tenants->id())->findOrFail($id);

        if ($role->name === self::LOCKED_ROLE) {
            throw ValidationException::withMessages(['permissions' => 'El rol administrador siempre tiene todos los permisos.']);
        }

        $data = $this->validated($request);
        $before = $role->permissions->pluck('name')->sort()->values()->all();
        $role->syncPermissions($data['permissions']);
        $after = collect($data['permissions'])->sort()->values()->all();

        if ($before !== $after) {
            $this->audit->log('role.updated', $role, "Cambió los permisos del rol {$role->name}", [
                'agregados' => [null, array_values(array_diff($after, $before))],
                'quitados' => [null, array_values(array_diff($before, $after))],
            ]);
        }

        return response()->json(['data' => $this->present($role->load('permissions'))]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => [$request->isMethod('post') ? 'required' : 'nullable', 'string', 'max:50'],
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);
    }

    private function present(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'locked' => $role->name === self::LOCKED_ROLE,
            // conteo directo en la pivote: Role::users() de spatie no resuelve el
            // modelo de usuario en consultas agregadas
            'users_count' => DB::table(config('permission.table_names.model_has_roles'))->where('role_id', $role->id)->count(),
            'permissions' => $role->name === self::LOCKED_ROLE
                ? Permission::where('guard_name', 'web')->pluck('name')
                : $role->permissions->pluck('name'),
        ];
    }
}
