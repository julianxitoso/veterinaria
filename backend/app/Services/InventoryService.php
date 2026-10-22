<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Único punto que modifica el stock: cada cambio queda en el kardex
 * (inventory_movements) con su motivo y el stock resultante.
 */
class InventoryService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Crea un producto y, si trae stock inicial, registra la entrada.
     */
    public function createProduct(array $data, User $user): Product
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::create(Arr::except($data, ['initial_stock']));

            if (($data['initial_stock'] ?? 0) > 0) {
                $this->move($product, 'entry', $data['initial_stock'], $user, [
                    'reason' => 'Inventario inicial',
                    'unit_cost' => $product->cost,
                    'expires_at' => $product->expires_at,
                ]);
            }

            return $product->refresh();
        });
    }

    /**
     * Registra un movimiento.
     *  - entry / exit / sale: `quantity` es la cantidad que entra o sale.
     *  - adjustment: `quantity` es el stock real contado; se registra la diferencia.
     *
     * @param  array{reason?: string, reference?: string, unit_cost?: float, lot?: string, expires_at?: mixed, source?: Model}  $options
     */
    public function move(Product $product, string $type, float $quantity, User $user, array $options = []): InventoryMovement
    {
        return DB::transaction(function () use ($product, $type, $quantity, $user, $options) {
            // bloquea la fila para que dos movimientos simultáneos no se pisen
            $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
            $current = (float) $product->stock;

            $delta = match ($type) {
                'entry' => $quantity,
                'exit', 'sale' => -$quantity,
                'adjustment' => $quantity - $current,
            };

            if ($type === 'adjustment' && abs($delta) < 0.001) {
                throw ValidationException::withMessages([
                    'quantity' => 'El conteo coincide con el stock actual; no hay nada que ajustar.',
                ]);
            }

            if ($current + $delta < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Stock insuficiente: hay {$this->format($current)} {$product->unit} de {$product->name}.",
                ]);
            }

            $newStock = $current + $delta;
            $product->stock = $newStock;

            if ($type === 'entry') {
                $this->applyEntry($product, $current, $options);
            }

            $product->save();

            $source = $options['source'] ?? null;

            // ventas y anulaciones ya quedan auditadas en la factura
            if (in_array($type, ['exit', 'adjustment'], true)) {
                $this->audit->log(
                    "inventory.{$type}",
                    $product,
                    ($type === 'exit' ? 'Salida' : 'Ajuste')." de {$product->name}: ".($delta > 0 ? '+' : '').round($delta, 2)." {$product->unit} (".($options['reason'] ?? '').')',
                    ['stock' => [$current, $newStock]],
                    $user,
                );
            }

            return $product->movements()->create([
                'user_id' => $user->id,
                'type' => $type,
                'quantity' => $delta,
                'stock_after' => $newStock,
                'unit_cost' => $options['unit_cost'] ?? null,
                'reason' => $options['reason'] ?? $this->defaultReason($type),
                'reference' => $options['reference'] ?? null,
                'source_type' => $source?->getMorphClass(),
                'source_id' => $source?->getKey(),
                'lot' => $options['lot'] ?? null,
                'expires_at' => $options['expires_at'] ?? null,
            ]);
        });
    }

    /**
     * Una compra actualiza el último costo y el próximo vencimiento: si no
     * había existencias se toma el del lote nuevo; si había, el más cercano.
     */
    private function applyEntry(Product $product, float $previousStock, array $options): void
    {
        if (! empty($options['unit_cost'])) {
            $product->cost = $options['unit_cost'];
        }

        if (empty($options['expires_at'])) {
            return;
        }

        $expires = Carbon::parse($options['expires_at']);

        if ($previousStock <= 0 || ! $product->expires_at || $expires->lt($product->expires_at)) {
            $product->expires_at = $expires;
        }
    }

    private function defaultReason(string $type): string
    {
        return match ($type) {
            'entry' => 'Entrada',
            'exit' => 'Salida',
            'adjustment' => 'Ajuste por conteo',
            'sale' => 'Venta',
        };
    }

    private function format(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
    }
}
