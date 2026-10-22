<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Pet;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VetSchedule;
use App\Tenancy\TenantManager;
use Illuminate\Database\Seeder;

/**
 * Horarios y citas de ejemplo para la clínica demo. Es aditivo:
 * se puede correr sobre una base existente con
 *   php artisan db:seed --class=AppointmentSeeder
 */
class AppointmentSeeder extends Seeder
{
    public function run(TenantManager $tenants): void
    {
        $tenant = Tenant::where('slug', 'demo')->firstOrFail();

        $tenants->runAs($tenant, function () {
            $vet = User::where('email', 'veterinario@demo.test')->firstOrFail();
            $admin = User::where('email', 'admin@demo.test')->firstOrFail();
            $reception = User::where('email', 'recepcionista@demo.test')->firstOrFail();

            if (VetSchedule::exists()) {
                return; // ya sembrado
            }

            // veterinario: L-V 8-12 y 14-18, sábado 8-12 · admin (también atiende): L-V 9-13
            foreach (range(1, 5) as $day) {
                VetSchedule::create(['user_id' => $vet->id, 'weekday' => $day, 'start_time' => '08:00', 'end_time' => '12:00']);
                VetSchedule::create(['user_id' => $vet->id, 'weekday' => $day, 'start_time' => '14:00', 'end_time' => '18:00']);
                VetSchedule::create(['user_id' => $admin->id, 'weekday' => $day, 'start_time' => '09:00', 'end_time' => '13:00']);
            }
            VetSchedule::create(['user_id' => $vet->id, 'weekday' => 6, 'start_time' => '08:00', 'end_time' => '12:00']);

            $pets = Pet::with('client')->inRandomOrder()->take(8)->get();
            $day = today()->isWeekend() ? today()->next('Monday') : today();
            $reasons = ['Control', 'Vacunación', 'Revisión de piel', 'Desparasitación', 'Control post-operatorio', 'Consulta general'];

            // agenda del día: confirmadas internas
            foreach ([['08:00', $vet], ['08:30', $vet], ['10:00', $vet], ['09:00', $admin], ['11:00', $admin], ['15:00', $vet]] as $i => [$time, $doctor]) {
                $pet = $pets[$i];
                Appointment::create([
                    'user_id' => $doctor->id, 'pet_id' => $pet->id, 'client_id' => $pet->client_id,
                    'starts_at' => $day->copy()->setTimeFromTimeString($time),
                    'ends_at' => $day->copy()->setTimeFromTimeString($time)->addMinutes(30),
                    'reason' => $reasons[$i % count($reasons)], 'status' => 'confirmed', 'source' => 'internal',
                    'created_by' => $reception->id,
                ]);
            }

            // solicitudes en línea pendientes de confirmar (mañana)
            $tomorrow = $day->copy()->addWeekday();
            Appointment::create([
                'user_id' => $vet->id, 'starts_at' => $tomorrow->copy()->setTime(9, 0), 'ends_at' => $tomorrow->copy()->setTime(9, 30),
                'reason' => 'Mi perro no quiere comer', 'status' => 'requested', 'source' => 'online',
                'contact_name' => 'Carolina Muñoz', 'contact_phone' => '3157778899', 'contact_document' => '1061777888',
                'pet_name' => 'Bruno', 'pet_species' => 'Perro',
            ]);
            $known = $pets[6];
            Appointment::create([
                'user_id' => $admin->id, 'pet_id' => $known->id, 'client_id' => $known->client_id,
                'starts_at' => $tomorrow->copy()->setTime(10, 0), 'ends_at' => $tomorrow->copy()->setTime(10, 30),
                'reason' => 'Vacuna anual', 'status' => 'requested', 'source' => 'online',
                'contact_name' => $known->client->name, 'contact_phone' => $known->client->phone,
                'pet_name' => $known->name, 'pet_species' => $known->species,
            ]);
        });
    }
}
