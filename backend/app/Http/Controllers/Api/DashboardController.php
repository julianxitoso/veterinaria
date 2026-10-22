<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Indicadores del día para la pantalla de inicio. Cada bloque solo se
 * incluye si el usuario tiene permiso sobre ese módulo.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = [];

        if ($user->can('citas.ver')) {
            $today = Appointment::whereDate('starts_at', today());

            $data['appointments'] = [
                'today' => (clone $today)->whereIn('status', [Appointment::REQUESTED, Appointment::CONFIRMED, Appointment::ATTENDED])->count(),
                'attended' => (clone $today)->where('status', Appointment::ATTENDED)->count(),
                'requested' => Appointment::where('status', Appointment::REQUESTED)->where('starts_at', '>=', now()->startOfDay())->count(),
                'upcoming' => AppointmentResource::collection(
                    Appointment::with(['veterinarian', 'pet', 'client'])
                        ->whereIn('status', [Appointment::REQUESTED, Appointment::CONFIRMED])
                        ->where('starts_at', '>=', now()->subMinutes(30))
                        ->whereDate('starts_at', today())
                        ->orderBy('starts_at')
                        ->limit(6)
                        ->get()
                ),
            ];
        }

        if ($user->can('consultas.ver')) {
            $data['consultations'] = [
                'today' => Consultation::whereDate('consulted_at', today())->count(),
                'open' => Consultation::where('status', Consultation::STATUS_OPEN)->count(),
            ];
        }

        if ($user->can('facturas.ver')) {
            $issuedToday = Invoice::where('status', Invoice::STATUS_ISSUED)->whereDate('issued_at', today());

            $data['sales'] = [
                'today_total' => (float) (clone $issuedToday)->sum('total'),
                'today_count' => (clone $issuedToday)->count(),
                'month_total' => (float) Invoice::where('status', Invoice::STATUS_ISSUED)
                    ->whereBetween('issued_at', [now()->startOfMonth(), now()])->sum('total'),
                'receivable' => (float) Invoice::where('status', Invoice::STATUS_ISSUED)
                    ->selectRaw('COALESCE(SUM(total - paid_total), 0) as balance')->value('balance'),
                'drafts' => Invoice::where('status', Invoice::STATUS_DRAFT)->count(),
            ];
        }

        if ($user->can('inventario.ver')) {
            $active = Product::where('is_active', true);

            $data['inventory'] = [
                'low_stock' => (clone $active)->lowStock()->count(),
                'expiring' => (clone $active)->expiring()->count(),
            ];
        }

        return response()->json(['data' => $data]);
    }
}
