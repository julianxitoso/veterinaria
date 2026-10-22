<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Database\Seeder;

/**
 * Catálogo demo de una clínica veterinaria. Debe ejecutarse dentro del
 * contexto de un tenant (TenantManager::runAs).
 */
class ProductSeeder extends Seeder
{
    /**
     * [nombre, categoría, unidad, costo, precio, IVA, stock, mínimo, días para vencer]
     */
    private const CATALOG = [
        ['Meloxicam 2 mg', 'Medicamentos', 'tableta', 900, 2000, 0, 120, 30, 400],
        ['Amoxicilina 500 mg', 'Medicamentos', 'tableta', 600, 1500, 0, 80, 40, 300],
        ['Metronidazol 250 mg', 'Medicamentos', 'tableta', 400, 1200, 0, 15, 30, 200],
        ['Omeprazol 20 mg', 'Medicamentos', 'cápsula', 500, 1300, 0, 60, 20, 25],
        ['Doxiciclina 100 mg', 'Medicamentos', 'tableta', 1100, 2500, 0, 4, 20, 180],
        ['Suero Lactato Ringer 500 ml', 'Medicamentos', 'frasco', 4500, 9000, 0, 24, 10, 500],
        ['Vacuna Antirrábica', 'Vacunas', 'dosis', 9000, 25000, 0, 30, 10, 120],
        ['Vacuna Polivalente DHPPi+L', 'Vacunas', 'dosis', 22000, 55000, 0, 12, 10, 20],
        ['Vacuna Triple Felina', 'Vacunas', 'dosis', 25000, 60000, 0, 8, 5, -5],
        ['Drontal Plus perro', 'Antiparasitarios', 'tableta', 6000, 12000, 19, 40, 15, 600],
        ['NexGard 10-25 kg', 'Antiparasitarios', 'tableta', 45000, 78000, 19, 18, 6, 365],
        ['Bravecto 20-40 kg', 'Antiparasitarios', 'tableta', 95000, 150000, 19, 3, 4, 365],
        ['Shampoo clorhexidina 250 ml', 'Higiene', 'frasco', 18000, 32000, 19, 10, 3, null],
        ['Limpiador ótico 120 ml', 'Higiene', 'frasco', 15000, 28000, 19, 7, 3, null],
        ['Alimento Gastrointestinal perro 2 kg', 'Alimentos', 'bolsa', 62000, 89000, 5, 6, 4, 240],
        ['Alimento Renal gato 1.5 kg', 'Alimentos', 'bolsa', 70000, 98000, 5, 2, 3, 150],
        ['Collar isabelino talla M', 'Insumos', 'unidad', 7000, 15000, 19, 9, 5, null],
        ['Jeringa 3 ml', 'Insumos', 'unidad', 250, 800, 19, 300, 100, 900],
    ];

    public function run(InventoryService $inventory): void
    {
        $admin = User::whereHas('roles', fn ($q) => $q->where('name', 'administrador'))->firstOrFail();

        foreach (self::CATALOG as $i => [$name, $category, $unit, $cost, $price, $tax, $stock, $min, $expiresInDays]) {
            $inventory->createProduct([
                'name' => $name,
                'code' => sprintf('P%03d', $i + 1),
                'category' => $category,
                'supplier' => $category === 'Alimentos' ? 'Distribuidora Pet Food' : 'Droguería Veterinaria del Cauca',
                'unit' => $unit,
                'cost' => $cost,
                'price' => $price,
                'tax_rate' => $tax,
                'min_stock' => $min,
                'expires_at' => $expiresInDays === null ? null : now()->addDays($expiresInDays)->toDateString(),
                'initial_stock' => $stock,
            ], $admin);
        }
    }
}
