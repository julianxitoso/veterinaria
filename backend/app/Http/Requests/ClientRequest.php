<?php

namespace App\Http\Requests;

use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'document_type' => ['required', Rule::in(['CC', 'CE', 'NIT', 'PAS', 'TI'])],
            'document' => [
                'nullable', 'string', 'max:30',
                Rule::unique('clients')
                    ->where('tenant_id', app(TenantManager::class)->id())
                    ->ignore($this->route('client')),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'document.unique' => 'Ya existe un cliente con este documento.',
        ];
    }
}
