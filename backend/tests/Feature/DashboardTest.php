<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    protected function setUp(): void
    {
        parent::setUp();
        $this->norte = app(TenantProvisioner::class)->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
    }

    public function test_dashboard_blocks_follow_permissions(): void
    {
        Sanctum::actingAs(User::where('email', 'admin@norte.test')->first());
        $this->withHeader('X-Tenant', 'norte')->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['appointments', 'consultations', 'sales', 'inventory']]);

        $assistant = app(TenantManager::class)->runAs($this->norte, fn () => User::create([
            'tenant_id' => $this->norte->id, 'name' => 'Asis', 'email' => 'asis@norte.test', 'password' => 'x',
        ])->assignRole('asistente'));

        Sanctum::actingAs($assistant);
        $data = $this->getJson('/api/dashboard')->assertOk()->json('data');

        $this->assertArrayHasKey('appointments', $data);
        $this->assertArrayNotHasKey('sales', $data); // el asistente no ve facturación
    }
}
