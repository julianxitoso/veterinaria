<?php

namespace App\Http\Requests;

use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConsultationRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = app(TenantManager::class)->id();
        $isCreate = $this->isMethod('post');

        return [
            // la mascota no se puede cambiar una vez creada la consulta
            'pet_id' => $isCreate
                ? ['required', 'integer', Rule::exists('pets', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')]
                : ['prohibited'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)->where('is_active', true)],
            'consulted_at' => ['required', 'date', 'before_or_equal:'.now()->addDay()->toDateString()],
            'reason' => ['required', 'string', 'max:255'],
            'anamnesis' => ['nullable', 'string', 'max:10000'],

            'weight' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'temperature' => ['nullable', 'numeric', 'between:25,45'],
            'heart_rate' => ['nullable', 'integer', 'between:1,500'],
            'respiratory_rate' => ['nullable', 'integer', 'between:1,300'],
            'physical_exam' => ['nullable', 'string', 'max:10000'],

            'diagnosis' => ['nullable', 'string', 'max:10000'],
            'treatment' => ['nullable', 'string', 'max:10000'],
            'instructions' => ['nullable', 'string', 'max:10000'],
            'observations' => ['nullable', 'string', 'max:10000'],
            'follow_up_date' => ['nullable', 'date'],

            'medications' => ['array', 'max:50'],
            'medications.*.name' => ['required', 'string', 'max:255'],
            'medications.*.dose' => ['nullable', 'string', 'max:100'],
            'medications.*.frequency' => ['nullable', 'string', 'max:100'],
            'medications.*.duration' => ['nullable', 'string', 'max:100'],
            'medications.*.route' => ['nullable', 'string', 'max:50'],
            'medications.*.notes' => ['nullable', 'string', 'max:1000'],
            'medications.*.product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'medications.*.dispense' => ['boolean'], // el cliente se lo lleva
            'medications.*.quantity' => ['nullable', 'required_if_accepted:medications.*.dispense', 'numeric', 'gt:0'],

            'exams' => ['array', 'max:50'],
            'exams.*.id' => ['nullable', 'integer'],
            'exams.*.name' => ['required', 'string', 'max:255'],
            'exams.*.notes' => ['nullable', 'string', 'max:1000'],

            // vacunas / desparasitaciones aplicadas durante la consulta (se agregan, no se reemplazan)
            'applications' => ['array', 'max:20'],
            'applications.*.type' => ['required', Rule::in(['vaccine', 'deworming'])],
            'applications.*.title' => ['required', 'string', 'max:255'],
            'applications.*.next_date' => ['nullable', 'date'],
            'applications.*.description' => ['nullable', 'string', 'max:1000'],

            // true = guardar y finalizar en el mismo paso
            'finalize' => ['boolean'],

            // cita desde la que se inicia la consulta (queda como atendida)
            'appointment_id' => [
                'nullable', 'integer',
                Rule::exists('appointments', 'id')->where('tenant_id', $tenantId)->whereIn('status', ['requested', 'confirmed']),
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'medications.*.name' => 'nombre del medicamento',
            'medications.*.quantity' => 'cantidad que lleva',
            'medications.*.product_id' => 'producto',
            'exams.*.name' => 'nombre del examen',
            'applications.*.title' => 'producto aplicado',
            'temperature' => 'temperatura',
            'heart_rate' => 'frecuencia cardiaca',
            'respiratory_rate' => 'frecuencia respiratoria',
        ];
    }
}
