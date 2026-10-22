<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $cost = fake()->numberBetween(2, 80) * 1000;

        return [
            'name' => fake()->unique()->words(2, true),
            'code' => fake()->unique()->bothify('PRD-####'),
            'category' => fake()->randomElement(['Medicamentos', 'Vacunas', 'Antiparasitarios', 'Alimentos', 'Higiene']),
            'supplier' => fake()->company(),
            'unit' => 'unidad',
            'cost' => $cost,
            'price' => round($cost * 1.4, -2),
            'tax_rate' => 19,
            'min_stock' => 5,
        ];
    }
}
