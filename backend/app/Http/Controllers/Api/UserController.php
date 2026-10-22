<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Usuarios de la clínica. User no usa el scope por tenant (la autenticación
 * lo necesita sin filtro), así que aquí se filtra explícitamente.
 */
class UserController extends Controller
{
    public function __construct(private TenantManager $tenants, private AuditLogger $audit) {}

    public function index(): AnonymousResourceCollection
    {
        $users = User::where('tenant_id', $this->tenants->id())
            ->with('roles')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();

        return UserResource::collection($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'tenant_id' => $this->tenants->id(),
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->syncRoles([$data['role']]);

            return $user;
        });

        $this->audit->log('user.created', $user, "Creó el usuario {$user->name} ({$data['role']})");

        return (new UserResource($user->load('roles')))->response()->setStatusCode(201);
    }

    public function update(Request $request, int $id): UserResource
    {
        $user = $this->find($id);
        $data = $this->validated($request, $user);
        $previousRole = $user->getRoleNames()->first();
        $deactivating = $user->is_active && array_key_exists('is_active', $data) && ! $data['is_active'];
        $losingAdmin = $previousRole === 'administrador' && ($data['role'] !== 'administrador' || $deactivating);

        if ($user->is($request->user()) && ($deactivating || $data['role'] !== $previousRole)) {
            throw ValidationException::withMessages(['role' => 'No puedes cambiar tu propio rol ni desactivarte.']);
        }

        if ($losingAdmin && $this->activeAdminsCount() <= 1) {
            throw ValidationException::withMessages(['role' => 'La clínica debe tener al menos un administrador activo.']);
        }

        DB::transaction(function () use ($user, $data) {
            $user->fill(collect($data)->only(['name', 'email', 'is_active'])->all());
            if (! empty($data['password'])) {
                $user->password = $data['password'];
            }
            $user->save();
            $user->syncRoles([$data['role']]);

            // al desactivar, se cierran todas sus sesiones
            if (! $user->is_active) {
                $user->tokens()->delete();
            }
        });

        $changes = $this->audit->diff($user);
        if ($previousRole !== $data['role']) {
            $changes['rol'] = [$previousRole, $data['role']];
        }
        if (! empty($data['password'])) {
            $changes['contraseña'] = ['—', 'restablecida'];
        }
        if ($changes) {
            $this->audit->log('user.updated', $user, "Modificó el usuario {$user->name}", $changes);
        }

        return new UserResource($user->load('roles'));
    }

    private function find(int $id): User
    {
        return User::where('tenant_id', $this->tenants->id())->findOrFail($id);
    }

    private function activeAdminsCount(): int
    {
        return User::where('tenant_id', $this->tenants->id())->where('is_active', true)->role('administrador')->count();
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $tenantId = $this->tenants->id();

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->where('tenant_id', $tenantId)->ignore($user)],
            'role' => ['required', Rule::exists('roles', 'name')->where('tenant_id', $tenantId)],
            // al crear es obligatoria; al editar, solo si se quiere restablecer
            'password' => [$user ? 'nullable' : 'required', Password::min(8)],
            'is_active' => ['boolean'],
        ], [
            'email.unique' => 'Ya existe un usuario con este email en la clínica.',
        ]);
    }
}
