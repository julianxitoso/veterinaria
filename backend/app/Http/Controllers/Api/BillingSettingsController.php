<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\AuditLogger;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Numeración y pie de página de las facturas.
 * Los datos legales de la clínica están en ClinicSettingsController.
 */
class BillingSettingsController extends Controller
{
    public const DEFAULT_FOOTER = 'Documento interno de venta. No reemplaza la factura electrónica ante la DIAN.';

    public function __construct(private TenantManager $tenants, private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prefix' => ['required', 'string', 'max:10', 'regex:/^[A-Za-z0-9-]*$/'],
            'next_number' => ['required', 'integer', 'min:1'],
            'footer' => ['nullable', 'string', 'max:1000'],
        ]);

        // el consecutivo no puede retroceder a números ya usados con el mismo prefijo
        $used = Invoice::where('number', 'like', $data['prefix'].'%')->pluck('number')
            ->map(fn ($n) => (int) substr($n, strlen($data['prefix'])))
            ->max() ?? 0;

        if ($data['next_number'] <= $used) {
            return response()->json([
                'message' => 'El consecutivo ya fue usado.',
                'errors' => ['next_number' => ["El siguiente número debe ser mayor que {$used}."]],
            ], 422);
        }

        $tenant = $this->tenants->get();
        $before = $this->payload();

        $settings = $tenant->settings ?? [];
        data_set($settings, 'invoicing', [
            'prefix' => $data['prefix'],
            'next_number' => $data['next_number'],
            'footer' => $data['footer'] ?? null,
        ]);
        $tenant->forceFill(['settings' => $settings])->save();

        $after = $this->payload();
        $changes = collect($after)->filter(fn ($v, $k) => $before[$k] !== $v)->map(fn ($v, $k) => [$before[$k], $v])->all();
        if ($changes) {
            $this->audit->log('settings.billing', $tenant, 'Modificó la configuración de facturación', $changes);
        }

        return response()->json(['data' => $after]);
    }

    private function payload(): array
    {
        $tenant = $this->tenants->get();

        return [
            'prefix' => $tenant->setting('invoicing.prefix', 'FV-'),
            'next_number' => (int) $tenant->setting('invoicing.next_number', 1),
            'footer' => $tenant->setting('invoicing.footer', self::DEFAULT_FOOTER),
        ];
    }
}
