<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryTest extends TestCase
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

    private function actingIn(string $role = 'administrador'): static
    {
        $user = $role === 'administrador'
            ? User::where('email', 'admin@norte.test')->first()
            : $this->inTenant($this->norte, fn () => User::create([
                'tenant_id' => $this->norte->id, 'name' => $role, 'email' => "{$role}@norte.test", 'password' => 'password',
            ])->assignRole($role));

        Sanctum::actingAs($user);

        return $this->withHeader('X-Tenant', 'norte');
    }

    private function inTenant(Tenant $tenant, callable $callback): mixed
    {
        return app(TenantManager::class)->runAs($tenant, $callback);
    }

    private function createProduct(array $overrides = []): array
    {
        return $this->postJson('/api/products', [
            'name' => 'Meloxicam 2 mg', 'unit' => 'tableta', 'cost' => 900, 'price' => 2000,
            'tax_rate' => 0, 'min_stock' => 10, 'initial_stock' => 50, ...$overrides,
        ])->assertCreated()->json('data');
    }

    public function test_product_with_initial_stock_creates_entry_movement(): void
    {
        $product = $this->actingIn()->createProduct();

        $this->assertEquals(50, (float) $product['stock']);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product['id'], 'type' => 'entry', 'quantity' => 50, 'stock_after' => 50, 'reason' => 'Inventario inicial',
        ]);
    }

    public function test_entry_exit_and_adjustment_update_stock(): void
    {
        $id = $this->actingIn()->createProduct()['id'];

        $this->postJson("/api/products/{$id}/movements", ['type' => 'entry', 'quantity' => 20, 'unit_cost' => 950, 'reference' => 'FV-123'])
            ->assertOk()->assertJsonPath('data.stock', '70.00')->assertJsonPath('data.cost', '950.00');

        $this->postJson("/api/products/{$id}/movements", ['type' => 'exit', 'quantity' => 5, 'reason' => 'Uso interno en cirugía'])
            ->assertOk()->assertJsonPath('data.stock', '65.00');

        // ajuste: se informa el conteo real y se registra la diferencia
        $this->postJson("/api/products/{$id}/movements", ['type' => 'adjustment', 'quantity' => 62, 'reason' => 'Conteo mensual'])
            ->assertOk()->assertJsonPath('data.stock', '62.00')->assertJsonPath('data.movements.0.quantity', '-3.00');
    }

    public function test_stock_cannot_go_negative(): void
    {
        $id = $this->actingIn()->createProduct(['initial_stock' => 3])['id'];

        $this->postJson("/api/products/{$id}/movements", ['type' => 'exit', 'quantity' => 5, 'reason' => 'Uso'])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');

        $this->assertEquals(3, (float) Product::withoutGlobalScopes()->find($id)->stock);
    }

    public function test_exit_requires_reason_and_sales_are_not_manual(): void
    {
        $id = $this->actingIn()->createProduct()['id'];

        $this->postJson("/api/products/{$id}/movements", ['type' => 'exit', 'quantity' => 1])
            ->assertJsonValidationErrors('reason');
        $this->postJson("/api/products/{$id}/movements", ['type' => 'sale', 'quantity' => 1, 'reason' => 'x'])
            ->assertJsonValidationErrors('type');
    }

    public function test_entry_with_earlier_expiry_updates_next_expiration(): void
    {
        $id = $this->actingIn()->createProduct(['expires_at' => now()->addYear()->toDateString()])['id'];

        $this->postJson("/api/products/{$id}/movements", ['type' => 'entry', 'quantity' => 10, 'expires_at' => now()->addMonths(2)->toDateString(), 'lot' => 'L-1'])
            ->assertJsonPath('data.expires_at', now()->addMonths(2)->toDateString());

        $this->postJson("/api/products/{$id}/movements", ['type' => 'entry', 'quantity' => 10, 'expires_at' => now()->addYears(2)->toDateString()])
            ->assertJsonPath('data.expires_at', now()->addMonths(2)->toDateString());
    }

    public function test_filters_and_alerts(): void
    {
        $this->actingIn();
        $this->createProduct(['name' => 'Bajo', 'initial_stock' => 2, 'min_stock' => 5]);
        $this->createProduct(['name' => 'Por vencer', 'expires_at' => now()->addDays(10)->toDateString()]);
        $this->createProduct(['name' => 'Vencido', 'expires_at' => now()->subDay()->toDateString()]);
        $this->createProduct(['name' => 'Normal']);

        $this->getJson('/api/products?filter=low_stock')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Bajo');
        $this->getJson('/api/products?filter=expiring')->assertJsonCount(2, 'data')->assertJsonPath('data.0.name', 'Vencido');
        $this->getJson('/api/products/alerts')->assertExactJson(['data' => ['low_stock' => 1, 'expiring' => 1, 'expired' => 1]]);
    }

    public function test_code_is_unique_per_clinic_and_products_are_isolated(): void
    {
        $this->inTenant($this->sur, fn () => Product::factory()->create(['code' => 'X1', 'name' => 'De Sur']));

        $this->actingIn()->createProduct(['code' => 'X1']);
        $this->postJson('/api/products', ['name' => 'Otro', 'code' => 'X1', 'unit' => 'u', 'cost' => 1, 'price' => 1, 'tax_rate' => 0, 'min_stock' => 0])
            ->assertJsonValidationErrors('code');

        $this->getJson('/api/products')->assertJsonMissing(['name' => 'De Sur']);
    }

    public function test_receptionist_cannot_access_inventory(): void
    {
        $this->actingIn('recepcionista')->getJson('/api/products')->assertForbidden();
    }

    public function test_vet_can_search_products_but_not_move_stock(): void
    {
        $id = $this->actingIn()->createProduct()['id'];

        $this->actingIn('veterinario')->getJson('/api/products?search=melox')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson("/api/products/{$id}/movements", ['type' => 'entry', 'quantity' => 1])->assertForbidden();
    }

    public function test_consultation_medication_links_product_and_dispense(): void
    {
        $productId = $this->actingIn()->createProduct()['id'];
        $pet = $this->inTenant($this->norte, fn () => Pet::factory()->create());

        $this->postJson('/api/consultations', [
            'pet_id' => $pet->id, 'consulted_at' => now()->toDateTimeString(), 'reason' => 'Dolor',
            'medications' => [['name' => 'Meloxicam 2 mg', 'product_id' => $productId, 'dispense' => true, 'quantity' => 10]],
        ])
            ->assertCreated()
            ->assertJsonPath('data.medications.0.product.id', $productId)
            ->assertJsonPath('data.medications.0.dispense', true);

        // "lo lleva" exige cantidad
        $this->postJson('/api/consultations', [
            'pet_id' => $pet->id, 'consulted_at' => now()->toDateTimeString(), 'reason' => 'Dolor',
            'medications' => [['name' => 'Meloxicam', 'product_id' => $productId, 'dispense' => true]],
        ])->assertJsonValidationErrors('medications.0.quantity');
    }
}
