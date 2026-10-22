<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Consultation>
 */
class ConsultationFactory extends Factory
{
    private const CASES = [
        ['Vómito y diarrea', 'Gastroenteritis aguda', 'Dieta blanda 3 días, hidratación oral, probióticos.'],
        ['Control de vacunación', 'Paciente sano', 'Se aplica refuerzo según esquema.'],
        ['Rascado constante', 'Dermatitis alérgica', 'Baños medicados semanales, antihistamínico.'],
        ['Cojera miembro posterior', 'Esguince leve', 'Reposo 10 días, antiinflamatorio.'],
        ['Decaimiento e inapetencia', 'Infección respiratoria alta', 'Antibiótico 7 días, nebulizaciones.'],
        ['Otitis', 'Otitis externa bacteriana', 'Limpieza ótica y gotas cada 12 horas.'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        [$reason, $diagnosis, $treatment] = fake()->randomElement(self::CASES);

        return [
            'pet_id' => Pet::factory(),
            'consulted_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'reason' => $reason,
            'anamnesis' => 'Propietario refiere: '.mb_strtolower($reason).' desde hace '.fake()->numberBetween(1, 5).' días.',
            'weight' => fake()->randomFloat(1, 3, 35),
            'temperature' => fake()->randomFloat(1, 37.5, 39.8),
            'heart_rate' => fake()->numberBetween(70, 160),
            'respiratory_rate' => fake()->numberBetween(15, 40),
            'physical_exam' => 'Mucosas rosadas, TLLC < 2 seg, ganglios normales.',
            'diagnosis' => $diagnosis,
            'treatment' => $treatment,
            'instructions' => 'Volver si los síntomas persisten.',
            'follow_up_date' => fake()->optional(0.3)->dateTimeBetween('-1 month', '+1 month'),
        ];
    }

    public function closed(): static
    {
        return $this->state(fn () => ['status' => Consultation::STATUS_CLOSED, 'closed_at' => now()]);
    }
}
