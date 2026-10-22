<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Consultation;
use App\Models\Pet;
use App\Models\User;
use App\Models\VetSchedule;
use App\Tenancy\TenantManager;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Agenda: disponibilidad por veterinario, reservas internas y online,
 * y ciclo de vida de la cita.
 */
class AppointmentService
{
    public const DEFAULTS = [
        'slot_minutes' => 30,
        'online_enabled' => true,
        'min_notice_hours' => 2,
        'max_days_ahead' => 30,
        // plantillas para avisar por WhatsApp; las {variables} se reemplazan al enviar
        'messages' => [
            'confirmed' => "Hola {cliente} 👋, te confirmamos la cita de *{mascota}* el *{fecha}* a las *{hora}* con {veterinario} en {clinica} ({direccion}).\n\nSi no puedes asistir, respóndenos este mensaje. ¡Te esperamos! 🐾",
            'reminder' => "Hola {cliente} 👋, te recordamos la cita de *{mascota}* el *{fecha}* a las *{hora}* con {veterinario} en {clinica}.\n\nSi necesitas reprogramar, respóndenos este mensaje. 🐾",
            'cancelled' => "Hola {cliente}, la cita de *{mascota}* del {fecha} a las {hora} en {clinica} fue cancelada.\n\nSi deseas agendar una nueva, escríbenos o llámanos al {telefono}. 🐾",
        ],
    ];

    /**
     * Transiciones permitidas entre estados.
     */
    private const TRANSITIONS = [
        Appointment::REQUESTED => [Appointment::CONFIRMED, Appointment::CANCELLED],
        Appointment::CONFIRMED => [Appointment::ATTENDED, Appointment::CANCELLED, Appointment::NO_SHOW],
        Appointment::NO_SHOW => [Appointment::CONFIRMED],
        Appointment::ATTENDED => [],
        Appointment::CANCELLED => [],
    ];

    public function __construct(private TenantManager $tenants, private AuditLogger $audit) {}

    public function settings(): array
    {
        $settings = array_replace_recursive(self::DEFAULTS, $this->tenants->get()->setting('appointments', []));

        // una plantilla vacía vuelve a la de por defecto
        foreach (self::DEFAULTS['messages'] as $key => $default) {
            if (blank($settings['messages'][$key] ?? null)) {
                $settings['messages'][$key] = $default;
            }
        }

        return $settings;
    }

    /**
     * Veterinarios activos que tienen horario configurado.
     */
    public function bookableVets(): Collection
    {
        $ids = VetSchedule::distinct()->pluck('user_id');

        return User::where('tenant_id', $this->tenants->id())
            ->where('is_active', true)
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /**
     * Espacios libres de un día: [{ time, starts_at, vet_ids }].
     * En modo público respeta la anticipación mínima y los días máximos.
     */
    public function availableSlots(Carbon $date, ?int $vetId = null, bool $public = false): array
    {
        $settings = $this->settings();
        $step = (int) $settings['slot_minutes'];
        $earliest = $public ? now()->addHours((int) $settings['min_notice_hours']) : now();

        if ($public && $date->copy()->startOfDay()->gt(today()->addDays((int) $settings['max_days_ahead']))) {
            return [];
        }

        $schedules = VetSchedule::where('weekday', $date->dayOfWeek)
            ->when($vetId, fn ($q) => $q->where('user_id', $vetId))
            ->whereIn('user_id', $this->bookableVets()->pluck('id'))
            ->get();

        $busy = Appointment::active()
            ->whereIn('user_id', $schedules->pluck('user_id')->unique())
            ->whereDate('starts_at', $date->toDateString())
            ->get(['user_id', 'starts_at', 'ends_at'])
            ->groupBy('user_id');

        $slots = [];

        foreach ($schedules as $block) {
            $cursor = $date->copy()->setTimeFromTimeString($block->start_time);
            $blockEnd = $date->copy()->setTimeFromTimeString($block->end_time);

            while ($cursor->copy()->addMinutes($step)->lte($blockEnd)) {
                $start = $cursor->copy();
                $end = $cursor->copy()->addMinutes($step);
                $cursor->addMinutes($step);

                if ($start->lt($earliest)) {
                    continue;
                }

                $taken = ($busy[$block->user_id] ?? collect())
                    ->contains(fn ($a) => $a->starts_at->lt($end) && $a->ends_at->gt($start));

                if (! $taken) {
                    $key = $start->format('H:i');
                    $slots[$key] ??= ['time' => $key, 'starts_at' => $start->toIso8601String(), 'vet_ids' => []];
                    $slots[$key]['vet_ids'][] = $block->user_id;
                }
            }
        }

        ksort($slots);

        return array_values(array_map(fn ($s) => [...$s, 'vet_ids' => array_values(array_unique($s['vet_ids']))], $slots));
    }

    /**
     * Cita creada por el personal: queda confirmada.
     */
    public function createInternal(array $data, User $author): Appointment
    {
        return DB::transaction(function () use ($data, $author) {
            $starts = Carbon::parse($data['starts_at']);
            $ends = $starts->copy()->addMinutes((int) ($data['duration'] ?? $this->settings()['slot_minutes']));

            $this->ensureFree($data['user_id'], $starts, $ends);

            $pet = Pet::findOrFail($data['pet_id']);

            $appointment = Appointment::create([
                'user_id' => $data['user_id'],
                'pet_id' => $pet->id,
                'client_id' => $pet->client_id,
                'starts_at' => $starts,
                'ends_at' => $ends,
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'status' => Appointment::CONFIRMED,
                'source' => 'internal',
                'created_by' => $author->id,
            ]);

            return $appointment;
        });
    }

    /**
     * Solicitud desde la agenda pública: solo en espacios disponibles,
     * asigna veterinario si no se eligió y reconoce clientes existentes.
     */
    public function createOnline(array $data): Appointment
    {
        $settings = $this->settings();

        if (! $settings['online_enabled']) {
            throw ValidationException::withMessages(['starts_at' => 'La agenda en línea no está disponible.']);
        }

        return DB::transaction(function () use ($data, $settings) {
            $starts = Carbon::parse($data['starts_at']);
            $slot = collect($this->availableSlots($starts->copy()->startOfDay(), $data['user_id'] ?? null, true))
                ->firstWhere('time', $starts->format('H:i'));

            if (! $slot) {
                throw ValidationException::withMessages(['starts_at' => 'Ese horario ya no está disponible. Elige otro.']);
            }

            $client = $this->matchClient($data['contact_document'] ?? null, $data['contact_phone']);
            $pet = $client?->pets()->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($data['pet_name']))])->first();

            return Appointment::create([
                'user_id' => $data['user_id'] ?? $slot['vet_ids'][0],
                'client_id' => $client?->id,
                'pet_id' => $pet?->id,
                'starts_at' => $starts,
                'ends_at' => $starts->copy()->addMinutes((int) $settings['slot_minutes']),
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'status' => Appointment::REQUESTED,
                'source' => 'online',
                ...collect($data)->only(['contact_name', 'contact_phone', 'contact_email', 'contact_document', 'pet_name', 'pet_species'])->all(),
            ]);
        });
    }

    /**
     * Reprogramar o reasignar veterinario.
     */
    public function update(Appointment $appointment, array $data): Appointment
    {
        if (! in_array($appointment->status, [Appointment::REQUESTED, Appointment::CONFIRMED], true)) {
            throw ValidationException::withMessages(['status' => 'Solo se pueden modificar citas solicitadas o confirmadas.']);
        }

        return DB::transaction(function () use ($appointment, $data) {
            $starts = Carbon::parse($data['starts_at']);
            $duration = (int) ($data['duration'] ?? $appointment->starts_at->diffInMinutes($appointment->ends_at));
            $ends = $starts->copy()->addMinutes($duration);

            $this->ensureFree($data['user_id'], $starts, $ends, $appointment->id);

            $rescheduled = ! $starts->eq($appointment->starts_at) || (int) $data['user_id'] !== (int) $appointment->user_id;
            $before = [$appointment->starts_at->format('d/m/Y H:i'), $appointment->veterinarian->name];

            $appointment->update([
                'user_id' => $data['user_id'],
                'starts_at' => $starts,
                'ends_at' => $ends,
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                ...(isset($data['pet_id']) ? ['pet_id' => $data['pet_id'], 'client_id' => Pet::findOrFail($data['pet_id'])->client_id] : []),
            ]);

            if ($rescheduled) {
                $appointment->load('veterinarian');
                $this->audit->log('appointment.rescheduled', $appointment, 'Reprogramó una cita', [
                    'fecha' => [$before[0], $starts->format('d/m/Y H:i')],
                    'veterinario' => [$before[1], $appointment->veterinarian->name],
                ]);
            }

            return $appointment;
        });
    }

    public function changeStatus(Appointment $appointment, string $status, ?string $reason = null): Appointment
    {
        if (! in_array($status, self::TRANSITIONS[$appointment->status] ?? [], true)) {
            throw ValidationException::withMessages(['status' => 'Ese cambio de estado no es posible para esta cita.']);
        }

        return DB::transaction(function () use ($appointment, $status, $reason) {
            // al confirmar una solicitud online se registran cliente y mascota
            if ($status === Appointment::CONFIRMED) {
                $this->ensureClientAndPet($appointment);
            }

            $appointment->update([
                'status' => $status,
                'cancel_reason' => $status === Appointment::CANCELLED ? $reason : $appointment->cancel_reason,
            ]);

            if ($status === Appointment::CANCELLED) {
                $this->audit->log('appointment.cancelled', $appointment, 'Canceló una cita'.($reason ? ": {$reason}" : ''));
            }

            return $appointment;
        });
    }

    /**
     * La consulta iniciada desde la cita la marca como atendida.
     */
    public function attachConsultation(Appointment $appointment, Consultation $consultation): void
    {
        if ($appointment->status === Appointment::REQUESTED) {
            $this->ensureClientAndPet($appointment);
        }

        $appointment->update(['status' => Appointment::ATTENDED, 'consultation_id' => $consultation->id]);
    }

    private function ensureFree(int $vetId, Carbon $starts, Carbon $ends, ?int $exceptId = null): void
    {
        $clash = Appointment::active()
            ->where('user_id', $vetId)
            ->overlapping($starts, $ends)
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->lockForUpdate()
            ->first();

        if ($clash) {
            throw ValidationException::withMessages([
                'starts_at' => "El veterinario ya tiene una cita de {$clash->starts_at->format('H:i')} a {$clash->ends_at->format('H:i')}.",
            ]);
        }
    }

    private function matchClient(?string $document, string $phone): ?Client
    {
        if ($document) {
            $client = Client::where('document', trim($document))->first();
            if ($client) {
                return $client;
            }
        }

        $digits = preg_replace('/\D/', '', $phone);

        return strlen($digits) >= 7 ? Client::where('phone', 'like', "%{$digits}")->first() : null;
    }

    private function ensureClientAndPet(Appointment $appointment): void
    {
        if (! $appointment->client_id) {
            $client = $this->matchClient($appointment->contact_document, (string) $appointment->contact_phone)
                ?? Client::create([
                    'name' => $appointment->contact_name ?? 'Cliente sin nombre',
                    'document_type' => 'CC',
                    'document' => $appointment->contact_document,
                    'phone' => $appointment->contact_phone,
                    'email' => $appointment->contact_email,
                ]);
            $appointment->client_id = $client->id;
        }

        if (! $appointment->pet_id) {
            $client = Client::find($appointment->client_id);
            $pet = $client->pets()->whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $appointment->pet_name))])->first()
                ?? $client->pets()->create([
                    'name' => $appointment->pet_name ?? 'Mascota',
                    'species' => $appointment->pet_species ?? 'Otro',
                    'sex' => 'unknown',
                ]);
            $appointment->pet_id = $pet->id;
        }

        $appointment->save();
    }
}
