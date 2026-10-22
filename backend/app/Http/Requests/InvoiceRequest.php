<?php

namespace App\Http\Requests;

use App\Models\Pet;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InvoiceRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = app(TenantManager::class)->id();
        $inTenant = fn (string $table) => Rule::exists($table, 'id')->where('tenant_id', $tenantId);

        return [
            'client_id' => ['required', 'integer', $inTenant('clients')->whereNull('deleted_at')],
            'pet_id' => [
                'nullable', 'integer', $inTenant('pets'),
                // la mascota debe ser del cliente facturado
                function (string $attribute, mixed $value, Closure $fail) {
                    if ($value && Pet::withTrashed()->whereKey($value)->value('client_id') != $this->input('client_id')) {
                        $fail('La mascota no pertenece al cliente seleccionado.');
                    }
                },
            ],
            'notes' => ['nullable', 'string', 'max:2000'],

            'items' => ['array', 'max:100'],
            'items.*.type' => ['required', Rule::in(['service', 'product'])],
            'items.*.product_id' => ['nullable', 'required_if:items.*.type,product', 'integer', $inTenant('products')],
            'items.*.service_id' => ['nullable', 'integer', $inTenant('services')],
            'items.*.consultation_medication_id' => ['nullable', 'integer', $inTenant('consultation_medications')],
            'items.*.description' => ['nullable', 'required_without_all:items.*.product_id,items.*.service_id', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'items.*.discount_pct' => ['nullable', 'numeric', 'between:0,100'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'items.*.description' => 'descripción',
            'items.*.quantity' => 'cantidad',
            'items.*.unit_price' => 'precio',
            'items.*.discount_pct' => 'descuento',
        ];
    }
}
