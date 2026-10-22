<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'document_type' => 'CC',
            'document' => (string) fake()->unique()->numberBetween(10000000, 1199999999),
            'phone' => '3'.fake()->numerify('#########'),
            'email' => fake()->safeEmail(),
            'address' => fake()->streetAddress(),
            'city' => fake()->randomElement(['Popayán', 'Cali', 'Bogotá', 'Medellín']),
        ];
    }
}
