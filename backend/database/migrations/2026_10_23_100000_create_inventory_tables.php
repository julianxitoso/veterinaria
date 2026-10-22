<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 50)->nullable(); // código interno o de barras
            $table->string('category', 100)->nullable();
            $table->string('supplier')->nullable();
            $table->string('unit', 30)->default('unidad'); // unidad, tableta, ml, frasco, caja…
            $table->decimal('cost', 12, 2)->default(0); // último costo de compra
            $table->decimal('price', 12, 2)->default(0); // precio de venta
            $table->decimal('tax_rate', 5, 2)->default(0); // IVA %
            $table->decimal('stock', 12, 2)->default(0);
            $table->decimal('min_stock', 12, 2)->default(0);
            $table->date('expires_at')->nullable(); // próximo vencimiento
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'name']);
            $table->index(['tenant_id', 'category']);
        });

        // kardex: todo cambio de stock queda registrado con su motivo
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('type', 20); // entry, exit, adjustment, sale
            $table->decimal('quantity', 12, 2); // con signo: + entra, - sale
            $table->decimal('stock_after', 12, 2);
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('reason'); // motivo obligatorio
            $table->string('reference')->nullable(); // ej. factura del proveedor
            $table->nullableMorphs('source'); // ej. la factura de venta (fase 5)
            $table->string('lot', 50)->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'product_id', 'created_at']);
            $table->index(['tenant_id', 'type', 'created_at']);
        });

        // productos indicados en la consulta
        Schema::table('consultation_medications', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('consultation_id')->constrained()->nullOnDelete();
            $table->boolean('dispense')->default(false)->after('notes'); // el cliente se lo lleva
            $table->decimal('quantity', 12, 2)->nullable()->after('dispense');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consultation_medications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn(['dispense', 'quantity']);
        });

        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('products');
    }
};
