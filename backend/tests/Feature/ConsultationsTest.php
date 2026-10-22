<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Pet;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsultationsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    private Tenant $sur;

    private User $vet;

    protected function setUp(): void
    {
        parent::setUp();

        $provisioner = app(TenantProvisioner::class);
        $this->sur = $provisioner->create(['name' => 'Sur', 'slug' => 'sur'], ['name' => 'Admin', 'email' => 'admin@sur.test', 'password' => 'password']);
        $this->norte = $provisioner->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
        $this->vet = $this->userInNorte('veterinario');
    }

    private function userInNorte(string $role): User
    {
        return $this->inTenant($this->norte, fn () => User::create([
            'tenant_id' => $this->norte->id,
            'name' => ucfirst($role),
            'email' => "{$role}@norte.test",
            'password' => 'password',
        ])->assignRole($role));
    }

    private function actingAsUser(User $user): static
    {
        Sanctum::actingAs($user);

        return $this->withHeader('X-Tenant', 'norte');
    }

    private function inTenant(Tenant $tenant, callable $callback): mixed
    {
        return app(TenantManager::class)->runAs($tenant, $callback);
    }

    private function petInNorte(array $attributes = []): Pet
    {
        return $this->inTenant($this->norte, fn () => Pet::factory()->create($attributes));
    }

    private function payload(Pet $pet, array $overrides = []): array
    {
        return [
            'pet_id' => $pet->id,
            'consulted_at' => now()->toDateTimeString(),
            'reason' => 'Vómito',
            'weight' => 12.4,
            'temperature' => 39.1,
            'diagnosis' => 'Gastroenteritis',
            'medications' => [['name' => 'Metronidazol', 'dose' => '1 tableta', 'frequency' => 'Cada 12 horas']],
            'exams' => [['name' => 'Hemograma']],
            ...$overrides,
        ];
    }

    public function test_vet_creates_consultation_with_medications_and_exams(): void
    {
        $pet = $this->petInNorte(['weight' => 10]);

        $this->actingAsUser($this->vet)
            ->postJson('/api/consultations', $this->payload($pet))
            ->assertCreated()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.veterinarian.id', $this->vet->id)
            ->assertJsonPath('data.medications.0.name', 'Metronidazol')
            ->assertJsonPath('data.exams.0.status', 'requested');

        // el peso de la consulta actualiza el peso de la mascota
        $this->assertEquals(12.4, (float) $pet->fresh()->weight);
    }

    public function test_older_consultation_does_not_overwrite_current_weight(): void
    {
        $pet = $this->petInNorte();
        $this->inTenant($this->norte, fn () => Consultation::factory()->for($pet)->create(['user_id' => $this->vet->id, 'consulted_at' => now(), 'weight' => 20]));
        $pet->update(['weight' => 20]);

        $this->actingAsUser($this->vet)
            ->postJson('/api/consultations', $this->payload($pet, ['consulted_at' => now()->subMonth()->toDateTimeString(), 'weight' => 15]))
            ->assertCreated();

        $this->assertEquals(20, (float) $pet->fresh()->weight);
    }

    public function test_closed_consultation_cannot_be_edited(): void
    {
        $pet = $this->petInNorte();
        $id = $this->actingAsUser($this->vet)->postJson('/api/consultations', $this->payload($pet))->json('data.id');

        $this->postJson("/api/consultations/{$id}/close")->assertOk()->assertJsonPath('data.status', 'closed');

        $this->putJson("/api/consultations/{$id}", $this->payload($pet, ['pet_id' => null]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_exam_result_can_be_recorded_after_closing(): void
    {
        $pet = $this->petInNorte();
        $data = $this->actingAsUser($this->vet)->postJson('/api/consultations', $this->payload($pet))->json('data');
        $this->postJson("/api/consultations/{$data['id']}/close");

        $this->putJson("/api/consultations/{$data['id']}/exams/{$data['exams'][0]['id']}", [
            'status' => 'completed',
            'result' => 'Leucocitosis leve',
        ])
            ->assertOk()
            ->assertJsonPath('data.exams.0.result', 'Leucocitosis leve');
    }

    public function test_updating_keeps_existing_exam_results(): void
    {
        $pet = $this->petInNorte();
        $data = $this->actingAsUser($this->vet)->postJson('/api/consultations', $this->payload($pet))->json('data');
        $examId = $data['exams'][0]['id'];
        $this->putJson("/api/consultations/{$data['id']}/exams/{$examId}", ['status' => 'completed', 'result' => 'Normal']);

        $payload = $this->payload($pet, ['exams' => [['id' => $examId, 'name' => 'Hemograma'], ['name' => 'Coprológico']]]);
        unset($payload['pet_id']);

        $this->putJson("/api/consultations/{$data['id']}", $payload)
            ->assertOk()
            ->assertJsonCount(2, 'data.exams')
            ->assertJsonPath('data.exams.0.result', 'Normal');
    }

    public function test_history_merges_consultations_and_records(): void
    {
        $pet = $this->petInNorte();
        $this->inTenant($this->norte, fn () => Consultation::factory()->for($pet)->create(['user_id' => $this->vet->id, 'consulted_at' => now()->subDays(10)]));

        $this->actingAsUser($this->vet)
            ->postJson("/api/pets/{$pet->id}/records", ['type' => 'vaccine', 'title' => 'Rabia', 'description' => 'Sin reacciones'])
            ->assertCreated();

        $this->getJson("/api/pets/{$pet->id}/history")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.kind', 'record')
            ->assertJsonPath('data.1.kind', 'consultation');
    }

    public function test_archived_records_are_hidden_but_kept(): void
    {
        $pet = $this->petInNorte();
        $recordId = $this->actingAsUser($this->vet)
            ->postJson("/api/pets/{$pet->id}/records", ['type' => 'note', 'description' => 'Error de digitación'])
            ->json('data.id');

        $this->postJson("/api/records/{$recordId}/archive")->assertOk();

        $this->getJson("/api/pets/{$pet->id}/history")->assertJsonCount(0, 'data');
        $this->getJson("/api/pets/{$pet->id}/history?include_archived=1")->assertJsonCount(1, 'data');
        $this->assertDatabaseHas('clinical_records', ['id' => $recordId]);
    }

    public function test_consultation_can_be_saved_and_finalized_in_one_step(): void
    {
        $pet = $this->petInNorte();

        $this->actingAsUser($this->vet)
            ->postJson('/api/consultations', $this->payload($pet, ['finalize' => true]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'closed');
    }

    public function test_applications_in_consultation_become_history_records(): void
    {
        $pet = $this->petInNorte();

        $id = $this->actingAsUser($this->vet)
            ->postJson('/api/consultations', $this->payload($pet, [
                'applications' => [['type' => 'vaccine', 'title' => 'Antirrábica', 'next_date' => now()->addYear()->toDateString()]],
            ]))
            ->assertCreated()
            ->json('data.id');

        $this->assertDatabaseHas('clinical_records', ['consultation_id' => $id, 'type' => 'vaccine', 'title' => 'Antirrábica']);

        // aparece como entrada propia en la historia, además de la consulta
        $this->getJson("/api/pets/{$pet->id}/history")
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['kind' => 'record']);
    }

    public function test_clinical_summary(): void
    {
        $pet = $this->petInNorte();
        $this->inTenant($this->norte, function () use ($pet) {
            Consultation::factory()->closed()->for($pet)->create([
                'user_id' => $this->vet->id, 'consulted_at' => now()->subMonth(), 'follow_up_date' => now()->subDays(3),
            ]);
            Consultation::factory()->for($pet)->create(['user_id' => $this->vet->id, 'consulted_at' => now()->subYear(), 'reason' => 'Antigua abierta']);
        });

        $this->actingAsUser($this->vet)->postJson("/api/pets/{$pet->id}/records", [
            'type' => 'vaccine', 'title' => 'Rabia', 'description' => 'x',
            'recorded_at' => now()->subYear()->toDateTimeString(), 'next_date' => now()->subDays(10)->toDateString(),
        ]);
        $this->postJson("/api/pets/{$pet->id}/records", [
            'type' => 'deworming', 'title' => 'Drontal', 'description' => 'x', 'next_date' => now()->addDays(10)->toDateString(),
        ]);

        $this->getJson("/api/pets/{$pet->id}/clinical-summary")
            ->assertOk()
            ->assertJsonPath('data.open_consultation.reason', 'Antigua abierta')
            ->assertJsonPath('data.follow_up.overdue', true)
            ->assertJsonPath('data.immunizations.0.title', 'Rabia')
            ->assertJsonPath('data.immunizations.0.status', 'overdue')
            ->assertJsonPath('data.immunizations.1.status', 'due_soon');
    }

    public function test_cannot_create_consultation_for_another_clinic_pet(): void
    {
        $foreign = $this->inTenant($this->sur, fn () => Pet::factory()->create());

        $this->actingAsUser($this->vet)
            ->postJson('/api/consultations', $this->payload($foreign))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('pet_id');
    }

    public function test_receptionist_can_view_but_not_create_consultations(): void
    {
        $pet = $this->petInNorte();

        $this->actingAsUser($this->userInNorte('recepcionista'))
            ->getJson('/api/consultations')->assertOk();

        $this->postJson('/api/consultations', $this->payload($pet))->assertForbidden();
    }

    public function test_attachments_are_private_and_tenant_scoped(): void
    {
        Storage::fake('local');
        $pet = $this->petInNorte();
        $consultationId = $this->actingAsUser($this->vet)->postJson('/api/consultations', $this->payload($pet))->json('data.id');

        $attachmentId = $this->post('/api/attachments', [
            'attachable_type' => 'consultation',
            'attachable_id' => $consultationId,
            'file' => UploadedFile::fake()->create('hemograma.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->get("/api/attachments/{$attachmentId}/download")->assertOk()->assertDownload('hemograma.pdf');

        // desde otra clínica no existe
        $sudAdmin = User::where('email', 'admin@sur.test')->first();
        Sanctum::actingAs($sudAdmin);
        $this->withHeader('X-Tenant', 'sur')->getJson("/api/attachments/{$attachmentId}/download")->assertNotFound();
    }
}
