<?php

namespace App\Http\Requests;

use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products')
                    ->where('tenant_id', app(TenantManager::class)->id())
                    ->ignore($this->route('product')),
            ],
            'category' => ['nullable', 'string', 'max:100'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:30'],
            'cost' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'min_stock' => ['required', 'numeric', 'min:0'],
            'expires_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            // el stock solo se fija al crear; después cambia con movimientos
            'initial_stock' => $this->isMethod('post') ? ['nullable', 'numeric', 'min:0'] : ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Ya existe un producto con este código.',
        ];
    }
}
