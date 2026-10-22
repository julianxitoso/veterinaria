<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pet>
 */
class PetFactory extends Factory
{
    private const BREEDS = [
        'Perro' => ['Criollo', 'Labrador', 'Golden Retriever', 'Pastor Alemán', 'Bulldog Francés', 'Poodle', 'Schnauzer'],
        'Gato' => ['Criollo', 'Siamés', 'Persa', 'Angora', 'Bengalí'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $species = fake()->randomElement(array_keys(self::BREEDS));

        return [
            'client_id' => Client::factory(),
            'name' => fake()->randomElement(['Luna', 'Max', 'Rocky', 'Kira', 'Toby', 'Milo', 'Nala', 'Simba', 'Lola', 'Zeus', 'Mía', 'Thor']),
            'species' => $species,
            'breed' => fake()->randomElement(self::BREEDS[$species]),
            'sex' => fake()->randomElement(['male', 'female']),
            'is_sterilized' => fake()->boolean(),
            'birth_date' => fake()->dateTimeBetween('-12 years', '-2 months'),
            'weight' => $species === 'Perro' ? fake()->randomFloat(1, 3, 40) : fake()->randomFloat(1, 2, 7),
            'color' => fake()->randomElement(['Negro', 'Blanco', 'Café', 'Atigrado', 'Dorado', 'Gris']),
        ];
    }
}
