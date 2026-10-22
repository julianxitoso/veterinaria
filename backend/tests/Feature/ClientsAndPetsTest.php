<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Pet;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientsAndPetsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    private Tenant $sur;

    protected function setUp(): void
    {
        parent::setUp();

        $provisioner = app(TenantProvisioner::class);
        $this->sur = $provisioner->create(['name' => 'Sur', 'slug' => 'sur'], ['name' => 'Admin', 'email' => 'admin@sur.test', 'password' => 'password']);
        $this->norte = $provisioner->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
    }

    /**
     * Ejecuta peticiones como un usuario de la clínica "norte" con el rol dado.
     */
    private function actingInNorte(string $role = 'administrador'): static
    {
        $user = app(TenantManager::class)->runAs($this->norte, function () use ($role) {
            return User::create([
                'tenant_id' => $this->norte->id,
                'name' => $role,
                'email' => "{$role}-".uniqid().'@norte.test',
                'password' => 'password',
            ])->assignRole($role);
        });

        Sanctum::actingAs($user);

        return $this->withHeader('X-Tenant', 'norte');
    }

    private function inTenant(Tenant $tenant, callable $callback): mixed
    {
        return app(TenantManager::class)->runAs($tenant, $callback);
    }

    public function test_creates_client_and_pet(): void
    {
        $clientId = $this->actingInNorte()
            ->postJson('/api/clients', ['name' => 'Ana Pérez', 'document_type' => 'CC', 'document' => '123', 'phone' => '3001234567'])
            ->assertCreated()
            ->json('data.id');

        $this->postJson('/api/pets', [
            'client_id' => $clientId,
            'name' => 'Luna',
            'species' => 'Perro',
            'sex' => 'female',
            'birth_date' => now()->subYears(3)->toDateString(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.client.name', 'Ana Pérez')
            ->assertJsonPath('data.age', '3 años');

        $this->assertDatabaseHas('pets', ['name' => 'Luna', 'tenant_id' => $this->norte->id]);
    }

    public function test_lists_only_own_clinic_data(): void
    {
        $this->inTenant($this->norte, fn () => Client::factory()->create(['name' => 'Cliente Norte']));
        $this->inTenant($this->sur, fn () => Client::factory()->create(['name' => 'Cliente Sur']));

        $this->actingInNorte()
            ->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Cliente Norte');
    }

    public function test_cannot_access_another_clinic_records(): void
    {
        $pet = $this->inTenant($this->sur, fn () => Pet::factory()->create());

        $this->actingInNorte()->getJson("/api/pets/{$pet->id}")->assertNotFound();
        $this->getJson("/api/clients/{$pet->client_id}")->assertNotFound();
    }

    public function test_cannot_assign_pet_to_another_clinic_client(): void
    {
        $foreign = $this->inTenant($this->sur, fn () => Client::factory()->create());

        $this->actingInNorte()
            ->postJson('/api/pets', ['client_id' => $foreign->id, 'name' => 'X', 'species' => 'Gato', 'sex' => 'male'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('client_id');
    }

    public function test_document_is_unique_per_clinic_only(): void
    {
        $this->inTenant($this->sur, fn () => Client::factory()->create(['document' => '999']));

        $this->actingInNorte()
            ->postJson('/api/clients', ['name' => 'A', 'document_type' => 'CC', 'document' => '999'])
            ->assertCreated();

        $this->postJson('/api/clients', ['name' => 'B', 'document_type' => 'CC', 'document' => '999'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('document');
    }

    public function test_searches_pets_by_owner_phone(): void
    {
        $this->inTenant($this->norte, function () {
            Pet::factory()->for(Client::factory()->state(['phone' => '3105550000']))->create(['name' => 'Rocky']);
            Pet::factory()->create(['name' => 'Otro']);
        });

        $this->actingInNorte()
            ->getJson('/api/pets?search=3105550000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Rocky');
    }

    public function test_client_with_pets_cannot_be_deleted(): void
    {
        $pet = $this->inTenant($this->norte, fn () => Pet::factory()->create());

        $this->actingInNorte()->deleteJson("/api/clients/{$pet->client_id}")->assertUnprocessable();
    }

    public function test_pet_delete_is_soft(): void
    {
        $pet = $this->inTenant($this->norte, fn () => Pet::factory()->create());

        $this->actingInNorte()->deleteJson("/api/pets/{$pet->id}")->assertNoContent();

        $this->assertSoftDeleted($pet);
    }

    public function test_assistant_cannot_delete_pets(): void
    {
        $pet = $this->inTenant($this->norte, fn () => Pet::factory()->create());

        $this->actingInNorte('asistente')->deleteJson("/api/pets/{$pet->id}")->assertForbidden();
    }
}
