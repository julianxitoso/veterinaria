<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantResource;
use App\Services\AuditLogger;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Identidad de la clínica: nombre, datos legales y de contacto, logo y color.
 */
class ClinicSettingsController extends Controller
{
    public function __construct(private TenantManager $tenants, private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'primary_color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $tenant = $this->tenants->get();
        $settings = $tenant->settings ?? [];
        $previousColor = data_get($settings, 'branding.primary_color');
        data_set($settings, 'branding.primary_color', strtolower($data['primary_color']));

        $tenant->fill(collect($data)->except('primary_color')->all());
        $tenant->settings = $settings;
        $tenant->save();

        $changes = collect($this->audit->diff($tenant))->except('settings')->all();
        if ($previousColor !== strtolower($data['primary_color'])) {
            $changes['color'] = [$previousColor, strtolower($data['primary_color'])];
        }
        if ($changes) {
            $this->audit->log('settings.clinic', $tenant, 'Modificó los datos de la clínica', $changes);
        }

        return response()->json(['data' => $this->payload()]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate(['logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048']]);

        $tenant = $this->tenants->get();

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
        }

        $tenant->update(['logo_path' => $request->file('logo')->store("tenants/{$tenant->id}/branding", 'public')]);
        $this->audit->log('settings.logo', $tenant, 'Cambió el logo de la clínica');

        return response()->json(['data' => $this->payload()]);
    }

    public function deleteLogo(): JsonResponse
    {
        $tenant = $this->tenants->get();

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
            $tenant->update(['logo_path' => null]);
            $this->audit->log('settings.logo', $tenant, 'Quitó el logo de la clínica');
        }

        return response()->json(['data' => $this->payload()]);
    }

    private function payload(): array
    {
        $tenant = $this->tenants->get();

        return [
            ...(new TenantResource($tenant))->resolve(),
            'legal_name' => $tenant->legal_name,
            'tax_id' => $tenant->tax_id,
            'address' => $tenant->address,
            'phone' => $tenant->phone,
            'email' => $tenant->email,
        ];
    }
}
