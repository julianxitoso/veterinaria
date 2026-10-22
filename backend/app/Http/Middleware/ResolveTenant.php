<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Detecta la clínica por subdominio ({slug}.app.com) o, en su defecto,
 * por el header X-Tenant. Responde 404 si la clínica no existe o está inactiva.
 */
class ResolveTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $slug = $this->slugFromHost($request->getHost())
            ?? $request->header(config('tenancy.header'));

        $tenant = $slug ? Tenant::where('slug', $slug)->first() : null;

        if (! $tenant || ! $tenant->is_active) {
            return response()->json(['message' => 'Clínica no encontrada o inactiva.'], 404);
        }

        $this->tenants->set($tenant);

        return $next($request);
    }

    private function slugFromHost(string $host): ?string
    {
        $central = config('tenancy.central_domain');

        if (! Str::endsWith($host, '.'.$central)) {
            return null;
        }

        $sub = Str::beforeLast($host, '.'.$central);

        // subdominios reservados de la plataforma
        return in_array($sub, ['www', 'api', 'admin'], true) ? null : $sub;
    }
}
