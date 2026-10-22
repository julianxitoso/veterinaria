<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClinicalRecordRequest;
use App\Http\Resources\ClinicalRecordResource;
use App\Http\Resources\ConsultationResource;
use App\Models\Appointment;
use App\Models\ClinicalRecord;
use App\Models\Consultation;
use App\Models\Pet;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalHistoryController extends Controller
{
    /**
     * Días antes del vencimiento en que una vacuna se considera "próxima".
     */
    private const DUE_SOON_DAYS = 30;

    /**
     * Historia clínica completa de la mascota: consultas y demás registros,
     * en una sola línea de tiempo (más reciente primero).
     */
    public function index(Request $request, Pet $pet): JsonResponse
    {
        $consultations = $pet->consultations()
            ->with([
                'veterinarian', 'exams', 'medications',
                'records' => fn ($q) => $q->active()->where('type', 'evolution')->with('author')->oldest('recorded_at'),
            ])
            ->withCount('attachments')
            ->get()
            ->map(fn ($c) => [
                'kind' => 'consultation',
                'date' => $c->consulted_at->toIso8601String(),
                'item' => new ConsultationResource($c),
                'attachments_count' => $c->attachments_count,
            ]);

        // las evoluciones se muestran dentro de su consulta; vacunas y demás
        // registros siempre tienen entrada propia (aunque vengan de una consulta)
        $records = $pet->clinicalRecords()
            ->where(fn (Builder $q) => $q->whereNull('consultation_id')->orWhere('type', '!=', 'evolution'))
            ->when(! $request->boolean('include_archived'), fn ($q) => $q->active())
            ->with(['author', 'attachments'])
            ->get()
            ->map(fn ($r) => [
                'kind' => 'record',
                'date' => $r->recorded_at->toIso8601String(),
                'item' => new ClinicalRecordResource($r),
            ]);

        $timeline = $consultations->concat($records)->sortByDesc('date')->values();

        return response()->json(['data' => $timeline]);
    }

    /**
     * Lo que el médico necesita ver de un vistazo: consulta en curso,
     * control pendiente y estado de vacunas / desparasitaciones.
     */
    public function summary(Pet $pet): JsonResponse
    {
        $open = $pet->consultations()
            ->where('status', Consultation::STATUS_OPEN)
            ->latest('consulted_at')
            ->first(['id', 'consulted_at', 'reason']);

        return response()->json(['data' => [
            'open_consultation' => $open ? [
                'id' => $open->id,
                'consulted_at' => $open->consulted_at->toIso8601String(),
                'reason' => $open->reason,
            ] : null,
            'follow_up' => $this->pendingFollowUp($pet),
            'next_appointment' => $this->nextAppointment($pet),
            'immunizations' => $this->immunizations($pet),
        ]]);
    }

    public function store(ClinicalRecordRequest $request, Pet $pet): JsonResponse
    {
        $record = $pet->clinicalRecords()->create([
            ...$request->validated(),
            'recorded_at' => $request->date('recorded_at') ?? now(),
            'user_id' => $request->user()->id,
        ]);

        return (new ClinicalRecordResource($record->load(['author', 'attachments'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * La historia clínica no se elimina: el registro se archiva y deja de mostrarse.
     */
    public function archive(ClinicalRecord $record): ClinicalRecordResource
    {
        $record->forceFill(['archived_at' => now()])->save();

        app(AuditLogger::class)->log('clinical_record.archived', $record, 'Archivó un registro de la historia clínica', [
            'registro' => [null, trim("{$record->type} {$record->title}: ".mb_substr($record->description, 0, 120))],
        ]);

        return new ClinicalRecordResource($record->load(['author', 'attachments']));
    }

    private function nextAppointment(Pet $pet): ?array
    {
        $next = Appointment::where('pet_id', $pet->id)
            ->whereIn('status', [Appointment::REQUESTED, Appointment::CONFIRMED])
            ->where('starts_at', '>=', now()->startOfDay())
            ->with('veterinarian:id,name')
            ->orderBy('starts_at')
            ->first();

        return $next ? [
            'id' => $next->id,
            'starts_at' => $next->starts_at->toIso8601String(),
            'status' => $next->status,
            'reason' => $next->reason,
            'veterinarian' => $next->veterinarian->name,
        ] : null;
    }

    /**
     * Control indicado en la última consulta que lo definió, si el paciente
     * no ha vuelto desde entonces.
     */
    private function pendingFollowUp(Pet $pet): ?array
    {
        $withFollowUp = $pet->consultations()
            ->whereNotNull('follow_up_date')
            ->latest('consulted_at')
            ->first(['id', 'consulted_at', 'follow_up_date']);

        if (! $withFollowUp) {
            return null;
        }

        $cameBack = $pet->consultations()->where('consulted_at', '>', $withFollowUp->consulted_at)->exists();

        if ($cameBack) {
            return null;
        }

        return [
            'date' => $withFollowUp->follow_up_date->toDateString(),
            'consultation_id' => $withFollowUp->id,
            'overdue' => $withFollowUp->follow_up_date->isPast() && ! $withFollowUp->follow_up_date->isToday(),
        ];
    }

    /**
     * Última aplicación de cada vacuna / desparasitación con su próxima dosis.
     */
    private function immunizations(Pet $pet): array
    {
        $today = now()->startOfDay();

        return $pet->clinicalRecords()
            ->active()
            ->whereIn('type', ['vaccine', 'deworming'])
            ->latest('recorded_at')
            ->get()
            ->unique(fn ($r) => $r->type.'|'.mb_strtolower(trim((string) $r->title)))
            ->filter(fn ($r) => $r->next_date !== null)
            ->map(fn ($r) => [
                'type' => $r->type,
                'title' => $r->title,
                'applied_at' => $r->recorded_at->toDateString(),
                'next_date' => $r->next_date->toDateString(),
                'status' => match (true) {
                    $r->next_date->lt($today) => 'overdue',
                    $r->next_date->lte($today->copy()->addDays(self::DUE_SOON_DAYS)) => 'due_soon',
                    default => 'ok',
                },
            ])
            ->sortBy('next_date')
            ->values()
            ->all();
    }
}
