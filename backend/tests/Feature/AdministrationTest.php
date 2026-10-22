<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdministrationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $provisioner = app(TenantProvisioner::class);
        $provisioner->create(['name' => 'Sur', 'slug' => 'sur'], ['name' => 'Admin Sur', 'email' => 'admin@sur.test', 'password' => 'password']);
        $this->norte = $provisioner->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
        $this->admin = User::where('email', 'admin@norte.test')->first();

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Tenant', 'norte');
    }

    private function createUser(string $role = 'veterinario', string $email = 'vet@norte.test'): array
    {
        return $this->postJson('/api/users', [
            'name' => 'Dra. Pérez', 'email' => $email, 'password' => 'secreta123', 'role' => $role,
        ])->assertCreated()->json('data');
    }

    public function test_admin_creates_user_who_can_login(): void
    {
        $user = $this->createUser();
        $this->assertEquals(['veterinario'], $user['roles']);

        $this->postJson('/api/auth/login', ['email' => 'vet@norte.test', 'password' => 'secreta123'])->assertOk();
    }

    public function test_users_list_is_scoped_to_clinic(): void
    {
        $this->getJson('/api/users')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissing(['name' => 'Admin Sur']);

        $foreignId = User::where('email', 'admin@sur.test')->value('id');
        $this->putJson("/api/users/{$foreignId}", ['name' => 'x', 'email' => 'x@x.co', 'role' => 'veterinario'])->assertNotFound();
    }

    public function test_deactivating_user_revokes_access(): void
    {
        $id = $this->createUser()['id'];
        $vet = User::find($id);
        $token = $vet->createToken('spa')->plainTextToken;

        $this->putJson("/api/users/{$id}", ['name' => 'Dra. Pérez', 'email' => 'vet@norte.test', 'role' => 'veterinario', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertNull($vet->tokens()->where('token', hash('sha256', explode('|', $token)[1]))->first());
    }

    public function test_cannot_demote_or_deactivate_self_nor_leave_clinic_without_admin(): void
    {
        $this->putJson("/api/users/{$this->admin->id}", ['name' => 'Admin', 'email' => 'admin@norte.test', 'role' => 'veterinario'])
            ->assertJsonValidationErrors('role');

        // con un segundo admin, el primero sí puede ser degradado por el otro
        $second = $this->createUser('administrador', 'admin2@norte.test');
        Sanctum::actingAs(User::find($second['id']));
        $this->putJson("/api/users/{$this->admin->id}", ['name' => 'Admin', 'email' => 'admin@norte.test', 'role' => 'contador'])->assertOk();

        // ahora queda un único admin activo: no se puede desactivar
        Sanctum::actingAs(User::where('email', 'admin@norte.test')->first());
        $this->putJson("/api/users/{$second['id']}", ['name' => 'X', 'email' => 'admin2@norte.test', 'role' => 'administrador', 'is_active' => false])
            ->assertForbidden(); // el contador no administra usuarios
    }

    public function test_role_permissions_can_be_changed_except_admin(): void
    {
        $roles = collect($this->getJson('/api/roles')->assertOk()->json('data'))->keyBy('name');

        $this->putJson("/api/roles/{$roles['administrador']['id']}", ['permissions' => []])->assertJsonValidationErrors('permissions');

        $this->putJson("/api/roles/{$roles['asistente']['id']}", ['permissions' => ['pacientes.ver', 'inventario.ver', 'inventario.mover-stock']])
            ->assertOk()
            ->assertJsonPath('data.permissions', ['pacientes.ver', 'inventario.ver', 'inventario.mover-stock']);

        $this->postJson('/api/roles', ['name' => 'Peluquero', 'permissions' => ['pacientes.ver', 'citas.ver']])
            ->assertCreated()->assertJsonPath('data.name', 'peluquero');

        $this->createUser('peluquero', 'groomer@norte.test');
    }

    public function test_clinic_settings_and_logo(): void
    {
        Storage::fake('public');

        $this->putJson('/api/settings/clinic', [
            'name' => 'Clínica Norte', 'tax_id' => '900.1', 'primary_color' => '#7C3AED',
        ])->assertOk()->assertJsonPath('data.primary_color', '#7c3aed');

        $this->getJson('/api/tenant')->assertJsonPath('data.name', 'Clínica Norte');

        $this->post('/api/settings/clinic/logo', ['logo' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.logo_url', fn ($url) => str_contains($url, 'branding'));

        $this->putJson('/api/settings/clinic', ['name' => 'X', 'primary_color' => 'rojo'])->assertJsonValidationErrors('primary_color');
    }

    public function test_profile_and_password_change(): void
    {
        $this->putJson('/api/profile', ['name' => 'Ana Admin', 'email' => 'ana@norte.test'])->assertOk()->assertJsonPath('data.name', 'Ana Admin');

        $this->putJson('/api/profile/password', ['current_password' => 'incorrecta', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345'])
            ->assertJsonValidationErrors('current_password');

        $this->putJson('/api/profile/password', ['current_password' => 'password', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345'])
            ->assertOk();

        $this->postJson('/api/auth/login', ['email' => 'ana@norte.test', 'password' => 'nueva12345'])->assertOk();
    }

    public function test_critical_actions_are_audited_per_clinic(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'admin@norte.test', 'password' => 'mala'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => 'admin@norte.test', 'password' => 'password'])->assertOk();
        $id = $this->createUser()['id'];
        $this->putJson("/api/users/{$id}", ['name' => 'Dra. Pérez', 'email' => 'vet@norte.test', 'role' => 'asistente']);

        $actions = collect($this->getJson('/api/audit-logs')->assertOk()->json('data'))->pluck('action');
        $this->assertEquals(['user.updated', 'user.created', 'auth.login', 'auth.failed'], $actions->all());

        $updated = $this->getJson('/api/audit-logs?action=user.updated')->json('data.0');
        $this->assertEquals(['veterinario', 'asistente'], $updated['changes']['rol']);

        // la otra clínica no ve estos registros
        $this->assertEquals(0, app(TenantManager::class)->runAs(Tenant::where('slug', 'sur')->first(), fn () => AuditLog::count()));
    }

    public function test_only_admin_sees_audit_and_users(): void
    {
        $vet = User::find($this->createUser()['id']);
        Sanctum::actingAs($vet);

        $this->getJson('/api/audit-logs')->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->putJson('/api/settings/clinic', ['name' => 'x', 'primary_color' => '#000000'])->assertForbidden();
        // pero sí puede editar su propio perfil
        $this->putJson('/api/profile', ['name' => 'Dra. Pérez G.', 'email' => 'vet@norte.test'])->assertOk();
    }
}
