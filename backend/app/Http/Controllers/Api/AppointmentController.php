<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\VetSchedule;
use App\Services\AppointmentService;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function __construct(private AppointmentService $appointments, private TenantManager $tenants) {}

    /**
     * Citas de un rango de fechas (agenda).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'from' => ['required_without:status', 'nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in([Appointment::REQUESTED, Appointment::CONFIRMED, Appointment::ATTENDED, Appointment::CANCELLED, Appointment::NO_SHOW])],
        ]);

        $appointments = Appointment::query()
            ->with(['veterinarian', 'client', 'pet', 'creator'])
            ->when($request->filled('from'), fn ($q) => $q->whereDate('starts_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('starts_at', '<=', $request->date('to')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('pet_id'), fn ($q) => $q->where('pet_id', $request->integer('pet_id')))
            ->orderBy('starts_at')
            ->limit(500)
            ->get();

        return AppointmentResource::collection($appointments);
    }

    /**
     * Horarios de trabajo y espacios libres de un día, para pintar la agenda.
     */
    public function day(Request $request): JsonResponse
    {
        $request->validate(['date' => ['required', 'date']]);
        $date = Carbon::parse($request->input('date'))->startOfDay();

        $tenant = $this->tenants->get();

        return response()->json(['data' => [
            'settings' => $this->appointments->settings(),
            // datos para armar los mensajes de WhatsApp al cliente
            'clinic' => ['name' => $tenant->name, 'address' => $tenant->address, 'phone' => $tenant->phone],
            'vets' => $this->appointments->bookableVets(),
            'schedules' => VetSchedule::where('weekday', $date->dayOfWeek)->get(['user_id', 'start_time', 'end_time']),
            'slots' => $this->appointments->availableSlots($date),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $appointment = $this->appointments->createInternal($this->validated($request), $request->user());

        return (new AppointmentResource($this->loadDetail($appointment)))->response()->setStatusCode(201);
    }

    public function update(Request $request, Appointment $appointment): AppointmentResource
    {
        $this->appointments->update($appointment, $this->validated($request, update: true));

        return new AppointmentResource($this->loadDetail($appointment->refresh()));
    }

    public function changeStatus(Request $request, Appointment $appointment): AppointmentResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([Appointment::CONFIRMED, Appointment::ATTENDED, Appointment::CANCELLED, Appointment::NO_SHOW])],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $this->appointments->changeStatus($appointment, $data['status'], $data['reason'] ?? null);

        return new AppointmentResource($this->loadDetail($appointment->refresh()));
    }

    private function validated(Request $request, bool $update = false): array
    {
        $tenantId = $this->tenants->id();

        return $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)->where('is_active', true)],
            'pet_id' => [$update ? 'nullable' : 'required', 'integer', Rule::exists('pets', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'starts_at' => ['required', 'date'],
            'duration' => ['nullable', 'integer', 'between:5,480'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function loadDetail(Appointment $appointment): Appointment
    {
        return $appointment->load(['veterinarian', 'client', 'pet', 'creator']);
    }
}
