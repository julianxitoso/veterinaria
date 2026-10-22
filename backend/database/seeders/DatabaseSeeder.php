<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ClinicalRecord;
use App\Models\Consultation;
use App\Models\Pet;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(TenantProvisioner $provisioner, TenantManager $tenants): void
    {
        $provisioner->syncPermissions();

        // clínica piloto: demo.app.com (o header X-Tenant: demo)
        $tenant = $provisioner->create(
            [
                'name' => 'Clínica Veterinaria Demo',
                'slug' => 'demo',
                'legal_name' => 'Veterinaria Demo S.A.S.',
                'tax_id' => '900.123.456-7',
                'address' => 'Calle 5 # 10-20, Popayán',
                'phone' => '602 820 0000',
                'email' => 'contacto@demo.test',
                'settings' => ['branding' => ['primary_color' => '#0d9488']],
            ],
            [
                'name' => 'Administrador Demo',
                'email' => 'admin@demo.test',
                'password' => 'password',
            ],
        );

        // un usuario por rol para probar permisos
        $tenants->runAs($tenant, function () use ($tenant) {
            foreach (['veterinario', 'recepcionista', 'asistente', 'contador'] as $role) {
                User::create([
                    'tenant_id' => $tenant->id,
                    'name' => ucfirst($role).' Demo',
                    'email' => "{$role}@demo.test",
                    'password' => 'password',
                ])->assignRole($role);
            }

            // clientes con 1 a 3 mascotas
            Client::factory(25)->create()->each(
                fn (Client $client) => Pet::factory(fake()->numberBetween(1, 3))->for($client)->create()
            );

            // historia clínica: consultas cerradas y vacunas para la mitad de las mascotas
            $vet = User::where('email', 'veterinario@demo.test')->first();

            Pet::inRandomOrder()->take(25)->get()->each(function (Pet $pet) use ($vet) {
                Consultation::factory(fake()->numberBetween(1, 3))->closed()->for($pet)->create(['user_id' => $vet->id])
                    ->each(function (Consultation $consultation) {
                        $consultation->medications()->create([
                            'name' => fake()->randomElement(['Meloxicam', 'Amoxicilina', 'Metronidazol', 'Omeprazol']),
                            'dose' => fake()->randomElement(['1 tableta', '0.5 ml', '2 ml']),
                            'frequency' => 'Cada '.fake()->randomElement([8, 12, 24]).' horas',
                            'duration' => fake()->numberBetween(3, 10).' días',
                            'route' => 'Oral',
                        ]);
                    });

                ClinicalRecord::create([
                    'pet_id' => $pet->id,
                    'user_id' => $vet->id,
                    'type' => 'vaccine',
                    'title' => $pet->species === 'Gato' ? 'Triple felina' : 'Polivalente (DHPPi+L)',
                    'description' => 'Aplicación sin reacciones adversas.',
                    'recorded_at' => now()->subMonths(fake()->numberBetween(1, 10)),
                    // algunas vencidas, algunas próximas, otras al día
                    'next_date' => now()->addDays(fake()->numberBetween(-60, 180)),
                ]);
            });

            $this->call(ProductSeeder::class);

            // facturas de algunas consultas: pagadas, con abono y pendientes
            $invoices = app(InvoiceService::class);
            $cashier = User::where('email', 'recepcionista@demo.test')->first();

            Consultation::where('status', Consultation::STATUS_CLOSED)->inRandomOrder()->take(8)->get()
                ->each(function (Consultation $consultation, int $i) use ($invoices, $cashier) {
                    $invoice = $invoices->fromConsultation($consultation, $cashier);
                    $total = (float) $invoice->total;
                    $payment = match ($i % 3) {
                        0 => ['amount' => $total, 'method' => 'cash'],
                        1 => ['amount' => round($total / 2, -3), 'method' => 'nequi'],
                        default => null,
                    };
                    $invoices->issue($invoice, $cashier, $payment);
                });

            // una consulta abierta hoy para probar edición y cierre
            Consultation::factory()->for(Pet::first())->create(['user_id' => $vet->id, 'consulted_at' => now()]);
        });

        $this->call(AppointmentSeeder::class);

        // super admin de la plataforma (sin clínica)
        User::forceCreate([
            'name' => 'Super Admin',
            'email' => 'superadmin@app.test',
            'password' => bcrypt('password'),
            'is_super_admin' => true,
        ]);
    }
}
