<?php

namespace App\Http\Requests;

use App\Models\Pet;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PetRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // el dueño debe pertenecer a la misma clínica
            'client_id' => [
                'required', 'integer',
                Rule::exists('clients', 'id')
                    ->where('tenant_id', app(TenantManager::class)->id())
                    ->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'species' => ['required', 'string', 'max:50'],
            'breed' => ['nullable', 'string', 'max:100'],
            'sex' => ['required', Rule::in(Pet::SEXES)],
            'is_sterilized' => ['boolean'],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'color' => ['nullable', 'string', 'max:100'],
            'microchip' => ['nullable', 'string', 'max:50'],
            'allergies' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'deceased_at' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'client_id.exists' => 'El dueño seleccionado no existe.',
        ];
    }
}
