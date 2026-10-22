<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VetSchedule;
use App\Services\AppointmentService;
use App\Services\AuditLogger;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Horarios de atención por veterinario y configuración de la agenda.
 */
class ScheduleController extends Controller
{
    public function __construct(
        private TenantManager $tenants,
        private AppointmentService $appointments,
        private AuditLogger $audit,
    ) {}

    public function index(): JsonResponse
    {
        $vets = User::where('tenant_id', $this->tenants->id())
            ->where('is_active', true)
            ->role(['veterinario', 'administrador'])
            ->orderBy('name')
            ->get(['id', 'name']);

        $schedules = VetSchedule::orderBy('weekday')->orderBy('start_time')->get()->groupBy('user_id');

        return response()->json([
            'data' => $vets->map(fn ($vet) => [
                'id' => $vet->id,
                'name' => $vet->name,
                'blocks' => ($schedules[$vet->id] ?? collect())->map(fn ($b) => [
                    'weekday' => $b->weekday,
                    'start_time' => substr($b->start_time, 0, 5),
                    'end_time' => substr($b->end_time, 0, 5),
                ])->values(),
            ]),
            'settings' => $this->appointments->settings(),
        ]);
    }

    /**
     * Reemplaza el horario semanal de un veterinario.
     */
    public function update(Request $request, int $userId): JsonResponse
    {
        $vet = User::where('tenant_id', $this->tenants->id())->findOrFail($userId);

        $data = $request->validate([
            'blocks' => ['present', 'array', 'max:30'],
            'blocks.*.weekday' => ['required', 'integer', 'between:0,6'],
            'blocks.*.start_time' => ['required', 'date_format:H:i'],
            'blocks.*.end_time' => ['required', 'date_format:H:i', 'after:blocks.*.start_time'],
        ], [
            'blocks.*.end_time.after' => 'La hora final debe ser posterior a la inicial.',
        ]);

        $this->ensureNoOverlap($data['blocks']);

        DB::transaction(function () use ($vet, $data) {
            VetSchedule::where('user_id', $vet->id)->delete();
            foreach ($data['blocks'] as $block) {
                VetSchedule::create([...$block, 'user_id' => $vet->id]);
            }
        });

        $this->audit->log('settings.schedule', $vet, "Modificó el horario de atención de {$vet->name}");

        return $this->index();
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slot_minutes' => ['required', 'integer', 'in:10,15,20,30,45,60,90,120'],
            'online_enabled' => ['required', 'boolean'],
            'min_notice_hours' => ['required', 'integer', 'between:0,168'],
            'max_days_ahead' => ['required', 'integer', 'between:1,180'],
            'messages' => ['nullable', 'array'],
            'messages.confirmed' => ['nullable', 'string', 'max:1000'],
            'messages.reminder' => ['nullable', 'string', 'max:1000'],
            'messages.cancelled' => ['nullable', 'string', 'max:1000'],
        ]);

        // si no se envían plantillas, se conservan las actuales
        $data['messages'] = $data['messages'] ?? $this->appointments->settings()['messages'];

        $tenant = $this->tenants->get();
        $settings = $tenant->settings ?? [];
        data_set($settings, 'appointments', $data);
        $tenant->forceFill(['settings' => $settings])->save();

        $this->audit->log('settings.appointments', $tenant, 'Modificó la configuración de la agenda');

        return response()->json(['data' => $this->appointments->settings()]);
    }

    private function ensureNoOverlap(array $blocks): void
    {
        foreach (collect($blocks)->groupBy('weekday') as $dayBlocks) {
            $sorted = $dayBlocks->sortBy('start_time')->values();
            for ($i = 1; $i < $sorted->count(); $i++) {
                if ($sorted[$i]['start_time'] < $sorted[$i - 1]['end_time']) {
                    throw ValidationException::withMessages(['blocks' => 'Hay bloques que se cruzan en el mismo día.']);
                }
            }
        }
    }
}
