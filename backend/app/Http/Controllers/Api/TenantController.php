<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantResource;
use App\Tenancy\TenantManager;

class TenantController extends Controller
{
    /**
     * Datos públicos de la clínica (nombre, logo, colores) para la pantalla de login.
     */
    public function show(TenantManager $tenants): TenantResource
    {
        return new TenantResource($tenants->get());
    }
}
