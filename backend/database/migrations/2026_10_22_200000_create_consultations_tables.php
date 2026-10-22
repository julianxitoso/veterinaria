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
        // entrada de consulta: cada vez que llega un paciente
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete(); // veterinario
            $table->dateTime('consulted_at');
            $table->string('reason'); // motivo de consulta
            $table->text('anamnesis')->nullable(); // síntomas / anamnesis

            // examen físico
            $table->decimal('weight', 6, 2)->nullable(); // kg
            $table->decimal('temperature', 4, 1)->nullable(); // °C
            $table->unsignedSmallInteger('heart_rate')->nullable(); // lpm
            $table->unsignedSmallInteger('respiratory_rate')->nullable(); // rpm
            $table->text('physical_exam')->nullable();

            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('instructions')->nullable(); // indicaciones al dueño
            $table->text('observations')->nullable(); // observaciones médicas
            $table->date('follow_up_date')->nullable(); // fecha de control

            $table->string('status', 20)->default('open'); // open, closed
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'consulted_at']);
            $table->index(['tenant_id', 'pet_id']);
            $table->index(['tenant_id', 'status']);
        });

        // medicamentos indicados en la consulta
        Schema::create('consultation_medications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('dose', 100)->nullable(); // ej. 1 tableta, 5 ml
            $table->string('frequency', 100)->nullable(); // ej. cada 12 horas
            $table->string('duration', 100)->nullable(); // ej. 7 días
            $table->string('route', 50)->nullable(); // oral, IM, IV, SC, tópica…
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // exámenes solicitados en la consulta
        Schema::create('consultation_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('requested'); // requested, completed
            $table->text('result')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // historia clínica: evolución, vacunas, procedimientos, notas…
        Schema::create('clinical_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('type', 30);
            $table->string('title')->nullable();
            $table->text('description');
            $table->dateTime('recorded_at');
            $table->date('next_date')->nullable(); // ej. próxima dosis de vacuna
            $table->timestamp('archived_at')->nullable(); // la historia no se borra, se archiva
            $table->timestamps();

            $table->index(['tenant_id', 'pet_id', 'recorded_at']);
        });

        // archivos adjuntos (exámenes, órdenes, imágenes) de cualquier registro
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->morphs('attachable');
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('clinical_records');
        Schema::dropIfExists('consultation_exams');
        Schema::dropIfExists('consultation_medications');
        Schema::dropIfExists('consultations');
    }
};
