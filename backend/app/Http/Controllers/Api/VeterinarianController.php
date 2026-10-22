<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;

class VeterinarianController extends Controller
{
    /**
     * Usuarios que pueden atender consultas (para selects y filtros).
     */
    public function index(TenantManager $tenants): JsonResponse
    {
        $vets = User::where('tenant_id', $tenants->id())
            ->where('is_active', true)
            ->role(['veterinario', 'administrador'])
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $vets]);
    }
}
