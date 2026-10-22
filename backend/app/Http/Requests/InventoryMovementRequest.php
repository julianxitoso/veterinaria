<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InventoryMovementRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $type = $this->input('type');

        return [
            // las ventas se registran desde la facturación, no a mano
            'type' => ['required', Rule::in(['entry', 'exit', 'adjustment'])],
            'quantity' => ['required', 'numeric', $type === 'adjustment' ? 'min:0' : 'gt:0', 'max:9999999'],
            'reason' => [$type === 'entry' ? 'nullable' : 'required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:255'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lot' => ['nullable', 'string', 'max:50'],
            'expires_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.gt' => 'La cantidad debe ser mayor que cero.',
            'reason.required' => 'Indica el motivo del movimiento.',
        ];
    }
}
