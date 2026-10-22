<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppointmentService;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Agenda en línea para dueños de mascotas, sin iniciar sesión.
 * Solo expone nombres de veterinarios y horarios libres.
 */
class PublicBookingController extends Controller
{
    public function __construct(private AppointmentService $appointments, private TenantManager $tenants) {}

    public function options(): JsonResponse
    {
        $settings = $this->appointments->settings();

        return response()->json(['data' => [
            'enabled' => (bool) $settings['online_enabled'],
            'slot_minutes' => (int) $settings['slot_minutes'],
            'max_days_ahead' => (int) $settings['max_days_ahead'],
            'vets' => $settings['online_enabled'] ? $this->appointments->bookableVets() : [],
            'clinic' => [
                'phone' => $this->tenants->get()->phone,
                'address' => $this->tenants->get()->address,
            ],
        ]]);
    }

    public function slots(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $slots = $this->appointments->settings()['online_enabled']
            ? $this->appointments->availableSlots(Carbon::parse($request->input('date')), $request->integer('user_id') ?: null, public: true)
            : [];

        // en público no se revela qué veterinarios están libres, salvo que se haya elegido uno
        return response()->json(['data' => array_map(fn ($s) => ['time' => $s['time'], 'starts_at' => $s['starts_at']], $slots)]);
    }

    public function store(Request $request): JsonResponse
    {
        // campo trampa: los humanos no lo ven, los bots lo llenan
        if ($request->filled('website')) {
            return response()->json(['message' => 'Solicitud recibida.'], 201);
        }

        $vetIds = $this->appointments->bookableVets()->pluck('id');

        $data = $request->validate([
            'user_id' => ['nullable', 'integer', Rule::in($vetIds)],
            'starts_at' => ['required', 'date', 'after:now'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'contact_name' => ['required', 'string', 'max:255'],
            'contact_phone' => ['required', 'string', 'min:7', 'max:30'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_document' => ['nullable', 'string', 'max:30'],
            'pet_name' => ['required', 'string', 'max:100'],
            'pet_species' => ['required', 'string', 'max:50'],
        ], [], [
            'contact_name' => 'nombre', 'contact_phone' => 'teléfono', 'pet_name' => 'nombre de la mascota',
            'pet_species' => 'especie', 'reason' => 'motivo', 'starts_at' => 'horario',
        ]);

        $appointment = $this->appointments->createOnline($data)->load('veterinarian');

        return response()->json(['data' => [
            'starts_at' => $appointment->starts_at->toIso8601String(),
            'veterinarian' => $appointment->veterinarian->name,
            'pet_name' => $data['pet_name'],
            'status' => $appointment->status,
        ]], 201);
    }
}
