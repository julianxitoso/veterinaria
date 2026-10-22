<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Pet;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppointmentsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $norte;

    private User $admin;

    private User $vetA;

    private User $vetB;

    protected function setUp(): void
    {
        parent::setUp();

        // lunes 2 de noviembre de 2026, 7:00 a. m.
        $this->travelTo('2026-11-02 07:00:00');

        $this->norte = app(TenantProvisioner::class)->create(['name' => 'Norte', 'slug' => 'norte'], ['name' => 'Admin', 'email' => 'admin@norte.test', 'password' => 'password']);
        $this->admin = User::where('email', 'admin@norte.test')->first();
        $this->vetA = $this->makeUser('Dra. Ana', 'veterinario');
        $this->vetB = $this->makeUser('Dr. Beto', 'veterinario');

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Tenant', 'norte');

        // Ana: lunes 8:00-10:00 · Beto: lunes 9:00-11:00 (bloques de 30 min por defecto)
        $this->putJson("/api/schedules/{$this->vetA->id}", ['blocks' => [['weekday' => 1, 'start_time' => '08:00', 'end_time' => '10:00']]])->assertOk();
        $this->putJson("/api/schedules/{$this->vetB->id}", ['blocks' => [['weekday' => 1, 'start_time' => '09:00', 'end_time' => '11:00']]])->assertOk();
    }

    private function makeUser(string $name, string $role): User
    {
        return app(TenantManager::class)->runAs($this->norte, fn () => User::create([
            'tenant_id' => $this->norte->id, 'name' => $name, 'email' => str($name)->slug().'@norte.test', 'password' => 'password',
        ])->assignRole($role));
    }

    private function pet(): Pet
    {
        return app(TenantManager::class)->runAs($this->norte, fn () => Pet::factory()->create());
    }

    private function publicSlots(string $date = '2026-11-02', ?int $vetId = null): array
    {
        return collect($this->withHeader('X-Tenant', 'norte')->getJson("/api/public/booking/slots?date={$date}".($vetId ? "&user_id={$vetId}" : ''))->assertOk()->json('data'))
            ->pluck('time')->all();
    }

    private function book(array $overrides = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/public/booking', [
            'starts_at' => '2026-11-02 10:00', 'reason' => 'Vacunación',
            'contact_name' => 'Laura Gómez', 'contact_phone' => '3001112233', 'contact_document' => '1061',
            'pet_name' => 'Toby', 'pet_species' => 'Perro', ...$overrides,
        ]);
    }

    public function test_slots_merge_vets_and_respect_min_notice(): void
    {
        // 7:00 + 2 h de anticipación → desde las 9:00; Ana hasta 10:00, Beto hasta 11:00
        $this->assertEquals(['09:00', '09:30', '10:00', '10:30'], $this->publicSlots());
        $this->assertEquals(['09:00', '09:30'], $this->publicSlots(vetId: $this->vetA->id));
        // martes: nadie atiende
        $this->assertEquals([], $this->publicSlots('2026-11-03'));
    }

    public function test_internal_appointment_blocks_slot_and_prevents_double_booking(): void
    {
        $pet = $this->pet();

        $this->postJson('/api/appointments', [
            'user_id' => $this->vetA->id, 'pet_id' => $pet->id, 'starts_at' => '2026-11-02 09:00', 'reason' => 'Control',
        ])->assertCreated()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.client.id', $pet->client_id);

        $this->postJson('/api/appointments', [
            'user_id' => $this->vetA->id, 'pet_id' => $pet->id, 'starts_at' => '2026-11-02 09:15', 'reason' => 'Otra',
        ])->assertJsonValidationErrors('starts_at');

        $this->assertEquals(['09:30'], $this->publicSlots(vetId: $this->vetA->id));
    }

    public function test_online_booking_assigns_free_vet_and_stays_requested(): void
    {
        // a las 10:00 solo Beto está libre
        $this->book()->assertCreated()->assertJsonPath('data.veterinarian', 'Dr. Beto')->assertJsonPath('data.status', 'requested');

        // el mismo horario ya no está disponible
        $this->book(['contact_phone' => '3009998877'])->assertJsonValidationErrors('starts_at');
    }

    public function test_online_booking_rejects_unavailable_times(): void
    {
        $this->book(['starts_at' => '2026-11-02 08:00'])->assertJsonValidationErrors('starts_at'); // sin anticipación
        $this->book(['starts_at' => '2026-11-03 09:00'])->assertJsonValidationErrors('starts_at'); // martes sin horario
        $this->book(['starts_at' => '2026-11-02 10:00', 'user_id' => $this->vetA->id])->assertJsonValidationErrors('starts_at'); // Ana no atiende a las 10
    }

    public function test_confirming_online_request_creates_client_and_pet(): void
    {
        $this->book()->assertCreated();
        $appointment = app(TenantManager::class)->runAs($this->norte, fn () => Appointment::first());
        $this->assertNull($appointment->client_id);

        $this->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.client.name', 'Laura Gómez')
            ->assertJsonPath('data.pet.name', 'Toby');
    }

    public function test_online_booking_recognizes_existing_client_and_pet(): void
    {
        $pet = app(TenantManager::class)->runAs($this->norte, fn () => Pet::factory()
            ->for(Client::factory()->state(['document' => '1061']))
            ->create(['name' => 'Toby']));

        $this->book()->assertCreated();

        $appointment = app(TenantManager::class)->runAs($this->norte, fn () => Appointment::first());
        $this->assertEquals($pet->id, $appointment->pet_id);
    }

    public function test_honeypot_and_disabled_booking(): void
    {
        $this->book(['website' => 'http://spam.example'])->assertCreated();
        $this->assertEquals(0, app(TenantManager::class)->runAs($this->norte, fn () => Appointment::count()));

        $this->putJson('/api/settings/appointments', ['slot_minutes' => 30, 'online_enabled' => false, 'min_notice_hours' => 2, 'max_days_ahead' => 30])->assertOk();
        $this->assertEquals([], $this->publicSlots());
        $this->book()->assertJsonValidationErrors('starts_at');
    }

    public function test_whatsapp_templates_have_defaults_and_can_be_customized(): void
    {
        $settings = fn () => $this->getJson('/api/appointments/day?date=2026-11-02')->assertOk()->json('data');

        $this->assertStringContainsString('{mascota}', $settings()['settings']['messages']['confirmed']);
        $this->assertEquals('Norte', $settings()['clinic']['name']);

        $base = ['slot_minutes' => 30, 'online_enabled' => true, 'min_notice_hours' => 2, 'max_days_ahead' => 30];
        $this->putJson('/api/settings/appointments', [...$base, 'messages' => ['confirmed' => 'Listo {mascota} a las {hora}', 'reminder' => '', 'cancelled' => null]])->assertOk();

        $messages = $settings()['settings']['messages'];
        $this->assertEquals('Listo {mascota} a las {hora}', $messages['confirmed']);
        // vacías vuelven a la plantilla por defecto
        $this->assertStringContainsString('te recordamos', $messages['reminder']);

        // guardar sin plantillas conserva las personalizadas
        $this->putJson('/api/settings/appointments', $base)->assertOk();
        $this->assertEquals('Listo {mascota} a las {hora}', $settings()['settings']['messages']['confirmed']);
    }

    public function test_status_transitions_and_reschedule(): void
    {
        $pet = $this->pet();
        $id = $this->postJson('/api/appointments', [
            'user_id' => $this->vetA->id, 'pet_id' => $pet->id, 'starts_at' => '2026-11-02 08:00', 'reason' => 'Control',
        ])->json('data.id');

        $this->putJson("/api/appointments/{$id}", ['user_id' => $this->vetB->id, 'starts_at' => '2026-11-02 10:30', 'reason' => 'Control'])
            ->assertOk()->assertJsonPath('data.veterinarian.name', 'Dr. Beto');

        $this->postJson("/api/appointments/{$id}/status", ['status' => 'cancelled', 'reason' => 'El cliente no puede'])->assertOk();
        $this->postJson("/api/appointments/{$id}/status", ['status' => 'confirmed'])->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.rescheduled']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.cancelled']);
    }

    public function test_starting_consultation_marks_appointment_attended(): void
    {
        $pet = $this->pet();
        $id = $this->postJson('/api/appointments', [
            'user_id' => $this->vetA->id, 'pet_id' => $pet->id, 'starts_at' => '2026-11-02 08:00', 'reason' => 'Control',
        ])->json('data.id');

        $consultationId = $this->postJson('/api/consultations', [
            'pet_id' => $pet->id, 'consulted_at' => '2026-11-02 08:05', 'reason' => 'Control', 'appointment_id' => $id,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('appointments', ['id' => $id, 'status' => 'attended', 'consultation_id' => $consultationId]);
    }

    public function test_schedule_blocks_cannot_overlap_and_only_admin_edits_them(): void
    {
        $this->putJson("/api/schedules/{$this->vetA->id}", ['blocks' => [
            ['weekday' => 1, 'start_time' => '08:00', 'end_time' => '12:00'],
            ['weekday' => 1, 'start_time' => '11:00', 'end_time' => '13:00'],
        ]])->assertJsonValidationErrors('blocks');

        Sanctum::actingAs($this->vetA);
        $this->putJson("/api/schedules/{$this->vetA->id}", ['blocks' => []])->assertForbidden();
        // el veterinario sí ve la agenda
        $this->getJson('/api/appointments?from=2026-11-02&to=2026-11-02')->assertOk();
    }
}
