<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Services\TenantProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantAuthTest extends TestCase
{
    use RefreshDatabase;

    private function createTenant(string $slug, string $email = 'admin@clinica.test'): Tenant
    {
        return app(TenantProvisioner::class)->create(
            ['name' => "Clínica {$slug}", 'slug' => $slug],
            ['name' => 'Admin', 'email' => $email, 'password' => 'password'],
        );
    }

    private function login(string $slug, string $email = 'admin@clinica.test'): string
    {
        return $this->withHeader('X-Tenant', $slug)
            ->postJson('/api/auth/login', ['email' => $email, 'password' => 'password'])
            ->assertOk()
            ->json('token');
    }

    public function test_unknown_tenant_returns_404(): void
    {
        $this->withHeader('X-Tenant', 'no-existe')
            ->getJson('/api/tenant')
            ->assertNotFound();
    }

    public function test_tenant_is_resolved_by_subdomain(): void
    {
        $this->createTenant('norte');

        $this->getJson('http://norte.'.config('tenancy.central_domain').'/api/tenant')
            ->assertOk()
            ->assertJsonPath('data.slug', 'norte');
    }

    public function test_admin_can_login_and_gets_all_permissions(): void
    {
        $this->createTenant('norte');
        $token = $this->login('norte');

        $this->withHeaders(['X-Tenant' => 'norte', 'Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.roles', ['administrador'])
            ->assertJsonFragment(['facturas.cerrar']);
    }

    public function test_user_cannot_login_in_another_clinic(): void
    {
        $this->createTenant('norte');
        $this->createTenant('sur', 'otro@clinica.test');

        $this->withHeader('X-Tenant', 'sur')
            ->postJson('/api/auth/login', ['email' => 'admin@clinica.test', 'password' => 'password'])
            ->assertUnprocessable();
    }

    public function test_token_cannot_be_used_in_another_clinic(): void
    {
        $this->createTenant('norte');
        $this->createTenant('sur', 'otro@clinica.test');
        $token = $this->login('norte');

        $this->withHeaders(['X-Tenant' => 'sur', 'Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me')
            ->assertForbidden();
    }

    public function test_roles_are_isolated_per_clinic(): void
    {
        $this->createTenant('norte');
        $this->createTenant('sur', 'otro@clinica.test');

        // cada clínica tiene su propio set de 5 roles
        $this->assertDatabaseCount('roles', 10);
    }
}
