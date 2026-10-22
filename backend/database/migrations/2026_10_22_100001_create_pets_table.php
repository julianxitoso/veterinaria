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
        // pacientes (animales)
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('species', 50); // perro, gato, ave, ...
            $table->string('breed', 100)->nullable();
            $table->string('sex', 10)->default('unknown'); // male, female, unknown
            $table->boolean('is_sterilized')->default(false);
            $table->date('birth_date')->nullable();
            $table->decimal('weight', 6, 2)->nullable(); // último peso conocido (kg)
            $table->string('color', 100)->nullable();
            $table->string('microchip', 50)->nullable();
            $table->string('photo_path')->nullable();
            $table->text('allergies')->nullable();
            $table->text('notes')->nullable();
            $table->date('deceased_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'name']);
            $table->index(['tenant_id', 'species']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
