<?php

namespace App\Http\Requests;

use App\Models\ClinicalRecord;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClinicalRecordRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(ClinicalRecord::TYPES)],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:10000'],
            'recorded_at' => ['nullable', 'date'],
            'next_date' => ['nullable', 'date'],
            // si se vincula a una consulta, debe ser de la misma mascota
            'consultation_id' => [
                'nullable', 'integer',
                Rule::exists('consultations', 'id')
                    ->where('tenant_id', app(TenantManager::class)->id())
                    ->where('pet_id', $this->route('pet')->id),
            ],
        ];
    }
}
