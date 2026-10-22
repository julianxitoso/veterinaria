<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Consultation;
use App\Models\Pet;
use App\Models\Product;
use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoicingTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    private User $admin;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $provisioner = app(TenantProvisioner::class);
        $provisioner->create(['name' => 'Sur', 'slug' => 'sur'], ['name' => 'Admin', 'email' => 'admin@sur.test', 'password' => 'password']);
        $this->norte = $provisioner->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
        $this->admin = User::where('email', 'admin@norte.test')->first();

        // 20 tabletas a $2.000 con IVA 19%
        $this->product = $this->inNorte(fn () => app(InventoryService::class)->createProduct([
            'name' => 'Meloxicam', 'unit' => 'tableta', 'cost' => 900, 'price' => 2000,
            'tax_rate' => 19, 'min_stock' => 0, 'initial_stock' => 20,
        ], $this->admin));

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Tenant', 'norte');
    }

    private function inNorte(callable $callback): mixed
    {
        return app(TenantManager::class)->runAs($this->norte, $callback);
    }

    private function consultationWithDispensedProduct(float $quantity = 5): Consultation
    {
        return $this->inNorte(function () use ($quantity) {
            $consultation = Consultation::factory()->for(Pet::factory())->create(['user_id' => $this->admin->id]);
            $consultation->medications()->create([
                'name' => 'Meloxicam', 'product_id' => $this->product->id, 'dispense' => true, 'quantity' => $quantity,
            ]);
            $consultation->medications()->create(['name' => 'Externo no facturable']);

            return $consultation;
        });
    }

    private function stock(): float
    {
        return (float) Product::withoutGlobalScopes()->find($this->product->id)->stock;
    }

    public function test_draft_from_consultation_includes_service_and_dispensed_products(): void
    {
        $consultation = $this->consultationWithDispensedProduct();

        $this->postJson("/api/consultations/{$consultation->id}/invoice")
            ->assertSuccessful()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.number', null)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.description', 'Consulta general')
            ->assertJsonPath('data.items.1.description', 'Meloxicam')
            // 50.000 consulta (sin IVA) + 5 x 2.000 + 19% = 50.000 + 11.900
            ->assertJsonPath('data.total', '61900.00');

        // pedirla de nuevo devuelve el mismo borrador
        $this->postJson("/api/consultations/{$consultation->id}/invoice")->assertJsonCount(2, 'data.items');
        $this->assertDatabaseCount('invoices', 1);
    }

    public function test_draft_does_not_touch_stock_and_issue_does(): void
    {
        $consultation = $this->consultationWithDispensedProduct(5);
        $id = $this->postJson("/api/consultations/{$consultation->id}/invoice")->json('data.id');

        $this->assertEquals(20, $this->stock());

        $this->postJson("/api/invoices/{$id}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', 'issued')
            ->assertJsonPath('data.number', 'FV-00001')
            ->assertJsonPath('data.payment_status', 'unpaid');

        $this->assertEquals(15, $this->stock());
        $this->assertDatabaseHas('inventory_movements', ['type' => 'sale', 'quantity' => -5, 'reference' => 'FV-00001', 'source_type' => 'invoice']);
        // emitir la factura finaliza la consulta
        $this->assertEquals('closed', $consultation->fresh()->status);
    }

    public function test_issue_fails_without_stock_and_rolls_back(): void
    {
        $consultation = $this->consultationWithDispensedProduct(50);
        $id = $this->postJson("/api/consultations/{$consultation->id}/invoice")->json('data.id');

        $this->postJson("/api/invoices/{$id}/issue")->assertUnprocessable()->assertJsonValidationErrors('quantity');

        $this->assertEquals(20, $this->stock());
        $this->assertDatabaseHas('invoices', ['id' => $id, 'status' => 'draft', 'number' => null]);
        $this->assertEquals('open', $consultation->fresh()->status);
    }

    public function test_numbering_is_sequential_and_configurable(): void
    {
        $client = $this->inNorte(fn () => Client::factory()->create());
        $draft = fn () => $this->postJson('/api/invoices', [
            'client_id' => $client->id,
            'items' => [['type' => 'service', 'description' => 'BaÃ±o', 'quantity' => 1, 'unit_price' => 30000]],
        ])->json('data.id');

        $this->postJson('/api/invoices/'.$draft().'/issue')->assertJsonPath('data.number', 'FV-00001');

        $this->putJson('/api/billing/settings', ['prefix' => 'VET-', 'next_number' => 100])->assertOk();
        $this->postJson('/api/invoices/'.$draft().'/issue')->assertJsonPath('data.number', 'VET-00100');
        $this->postJson('/api/invoices/'.$draft().'/issue')->assertJsonPath('data.number', 'VET-00101');

        // no se puede volver a un consecutivo usado
        $this->putJson('/api/billing/settings', ['prefix' => 'VET-', 'next_number' => 50])->assertJsonValidationErrors('next_number');
    }

    public function test_line_discount_and_totals(): void
    {
        $client = $this->inNorte(fn () => Client::factory()->create());

        $this->postJson('/api/invoices', [
            'client_id' => $client->id,
            'items' => [
                ['type' => 'product', 'product_id' => $this->product->id, 'quantity' => 10, 'discount_pct' => 10],
                ['type' => 'service', 'description' => 'BaÃ±o', 'quantity' => 1, 'unit_price' => 30000],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.subtotal', '50000.00')        // 20.000 + 30.000
            ->assertJsonPath('data.discount_total', '2000.00')   // 10% de 20.000
            ->assertJsonPath('data.tax_total', '3420.00')        // 19% de 18.000
            ->assertJsonPath('data.total', '51420.00');
    }

    public function test_payments_partial_and_full(): void
    {
        $client = $this->inNorte(fn () => Client::factory()->create());
        $id = $this->postJson('/api/invoices', [
            'client_id' => $client->id,
            'items' => [['type' => 'service', 'description' => 'CirugÃ­a', 'quantity' => 1, 'unit_price' => 100000]],
        ])->json('data.id');

        // emitir con abono en el mismo paso
        $this->postJson("/api/invoices/{$id}/issue", ['payment' => ['amount' => 40000, 'method' => 'cash']])
            ->assertJsonPath('data.payment_status', 'partial')
            ->assertJsonPath('data.balance', 60000);

        $this->postJson("/api/invoices/{$id}/payments", ['amount' => 70000, 'method' => 'nequi'])->assertJsonValidationErrors('amount');

        $this->postJson("/api/invoices/{$id}/payments", ['amount' => 60000, 'method' => 'transfer', 'reference' => 'TRX-1'])
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonCount(2, 'data.payments');
    }

    public function test_issued_invoice_cannot_be_edited_and_void_returns_stock(): void
    {
        $consultation = $this->consultationWithDispensedProduct(5);
        $id = $this->postJson("/api/consultations/{$consultation->id}/invoice")->json('data.id');
        $this->postJson("/api/invoices/{$id}/issue");

        $this->putJson("/api/invoices/{$id}", ['client_id' => $consultation->pet->client_id, 'items' => []])->assertJsonValidationErrors('status');
        $this->deleteJson("/api/invoices/{$id}")->assertJsonValidationErrors('status');

        $this->postJson("/api/invoices/{$id}/void", ['reason' => 'Error en cantidades'])
            ->assertOk()
            ->assertJsonPath('data.status', 'voided');

        $this->assertEquals(20, $this->stock());

        // anulada, la consulta se puede volver a facturar
        $this->postJson("/api/consultations/{$consultation->id}/invoice")->assertSuccessful()->assertJsonPath('data.status', 'draft');
    }

    public function test_pet_must_belong_to_client(): void
    {
        [$client, $otherPet] = $this->inNorte(fn () => [Client::factory()->create(), Pet::factory()->create()]);

        $this->postJson('/api/invoices', ['client_id' => $client->id, 'pet_id' => $otherPet->id, 'items' => []])
            ->assertJsonValidationErrors('pet_id');
    }

    public function test_vet_cannot_create_invoices_and_receptionist_cannot_void(): void
    {
        $makeUser = fn (string $role) => $this->inNorte(fn () => User::create([
            'tenant_id' => $this->norte->id, 'name' => $role, 'email' => "{$role}@norte.test", 'password' => 'x',
        ])->assignRole($role));

        $consultation = $this->consultationWithDispensedProduct();

        Sanctum::actingAs($makeUser('veterinario'));
        $this->postJson("/api/consultations/{$consultation->id}/invoice")->assertForbidden();

        Sanctum::actingAs($makeUser('recepcionista'));
        $id = $this->postJson("/api/consultations/{$consultation->id}/invoice")->assertSuccessful()->json('data.id');
        $this->postJson("/api/invoices/{$id}/issue")->assertOk();
        $this->postJson("/api/invoices/{$id}/void", ['reason' => 'x'])->assertForbidden();
    }

    public function test_pdfs_are_generated(): void
    {
        $consultation = $this->consultationWithDispensedProduct();
        $this->inNorte(fn () => $consultation->exams()->create(['name' => 'Hemograma']));
        $id = $this->postJson("/api/consultations/{$consultation->id}/invoice")->json('data.id');

        foreach ([
            "/api/invoices/{$id}/pdf",
            "/api/consultations/{$consultation->id}/prescription.pdf",
            "/api/consultations/{$consultation->id}/exam-order.pdf",
            "/api/pets/{$consultation->pet_id}/history.pdf",
        ] as $url) {
            $response = $this->get($url)->assertOk();
            $this->assertStringStartsWith('%PDF', $response->getContent(), $url);
        }
    }

    public function test_new_clinic_gets_default_services(): void
    {
        $this->assertEquals(5, $this->inNorte(fn () => Service::count()));
        $this->getJson('/api/services')->assertJsonPath('data.0.name', 'Consulta general');
    }
}
