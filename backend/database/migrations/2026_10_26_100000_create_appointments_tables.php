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
        // horario de atención de cada veterinario (varios bloques por día)
        Schema::create('vet_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0 = domingo … 6 = sábado
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'weekday']);
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete(); // veterinario
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pet_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); // null = agenda online
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('confirmed'); // requested, confirmed, attended, cancelled, no_show
            $table->string('source', 20)->default('internal'); // internal, online
            $table->string('cancel_reason')->nullable();

            // datos que deja quien agenda online sin ser cliente registrado
            $table->string('contact_name')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_document', 30)->nullable();
            $table->string('pet_name')->nullable();
            $table->string('pet_species', 50)->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'starts_at']);
            $table->index(['tenant_id', 'user_id', 'starts_at']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('vet_schedules');
    }
};
