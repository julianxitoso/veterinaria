<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConsultationService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Campos del request que no son columnas de la consulta.
     */
    private const NESTED = ['medications', 'exams', 'applications', 'finalize', 'appointment_id'];

    /**
     * Registra una nueva entrada de consulta con sus medicamentos, exámenes
     * y aplicaciones. Con `finalize` queda cerrada en el mismo paso.
     */
    public function create(array $data, User $author): Consultation
    {
        return DB::transaction(function () use ($data, $author) {
            $consultation = Consultation::create([
                ...Arr::except($data, self::NESTED),
                'user_id' => $data['user_id'] ?? $author->id,
            ]);

            $consultation->medications()->createMany($data['medications'] ?? []);
            $consultation->exams()->createMany(
                array_map(fn ($exam) => Arr::except($exam, 'id'), $data['exams'] ?? [])
            );
            $this->addApplications($consultation, $data['applications'] ?? [], $author);

            $this->updatePetWeight($consultation);

            if (! empty($data['appointment_id'])) {
                app(AppointmentService::class)->attachConsultation(Appointment::findOrFail($data['appointment_id']), $consultation);
            }

            if (! empty($data['finalize'])) {
                $this->close($consultation);
            }

            return $consultation;
        });
    }

    /**
     * Actualiza una consulta en curso. Los exámenes existentes se conservan
     * (con sus resultados) si siguen en la lista; los medicamentos se reemplazan.
     */
    public function update(Consultation $consultation, array $data, User $author): Consultation
    {
        $this->ensureOpen($consultation);

        // sin veterinario explícito se conserva el asignado
        if (empty($data['user_id'])) {
            unset($data['user_id']);
        }

        return DB::transaction(function () use ($consultation, $data, $author) {
            $consultation->update(Arr::except($data, self::NESTED));

            if (array_key_exists('medications', $data)) {
                $consultation->medications()->delete();
                $consultation->medications()->createMany($data['medications']);
            }

            if (array_key_exists('exams', $data)) {
                $this->syncExams($consultation, $data['exams']);
            }

            $this->addApplications($consultation, $data['applications'] ?? [], $author);

            $this->updatePetWeight($consultation);

            if (! empty($data['finalize'])) {
                $this->close($consultation);
            }

            return $consultation;
        });
    }

    public function close(Consultation $consultation): Consultation
    {
        $this->ensureOpen($consultation);

        $consultation->forceFill([
            'status' => Consultation::STATUS_CLOSED,
            'closed_at' => now(),
        ])->save();

        $this->audit->log('consultation.closed', $consultation, "Finalizó la consulta \"{$consultation->reason}\"");

        return $consultation;
    }

    /**
     * Las vacunas y desparasitaciones aplicadas quedan como registros propios de
     * la historia clínica (con su próxima dosis), vinculados a la consulta.
     */
    private function addApplications(Consultation $consultation, array $applications, User $author): void
    {
        foreach ($applications as $application) {
            $consultation->records()->create([
                'pet_id' => $consultation->pet_id,
                'user_id' => $consultation->user_id ?? $author->id,
                'type' => $application['type'],
                'title' => $application['title'],
                'description' => $application['description'] ?? 'Aplicada durante la consulta.',
                'recorded_at' => $consultation->consulted_at,
                'next_date' => $application['next_date'] ?? null,
            ]);
        }
    }

    private function syncExams(Consultation $consultation, array $exams): void
    {
        $keepIds = collect($exams)->pluck('id')->filter()->all();

        $consultation->exams()->whereNotIn('id', $keepIds)->delete();

        foreach ($exams as $exam) {
            $existing = isset($exam['id']) ? $consultation->exams()->find($exam['id']) : null;

            $existing
                ? $existing->update(Arr::only($exam, ['name', 'notes']))
                : $consultation->exams()->create(Arr::except($exam, 'id'));
        }
    }

    /**
     * El peso de la consulta más reciente pasa a ser el peso actual de la mascota.
     */
    private function updatePetWeight(Consultation $consultation): void
    {
        if ($consultation->weight === null) {
            return;
        }

        $isLatest = ! Consultation::where('pet_id', $consultation->pet_id)
            ->whereNotNull('weight')
            ->where('consulted_at', '>', $consultation->consulted_at)
            ->exists();

        if ($isLatest) {
            $consultation->pet()->update(['weight' => $consultation->weight]);
        }
    }

    private function ensureOpen(Consultation $consultation): void
    {
        if (! $consultation->isOpen()) {
            throw ValidationException::withMessages([
                'status' => 'La consulta ya fue finalizada y no se puede modificar. Agrega una nota de evolución.',
            ]);
        }
    }
}
