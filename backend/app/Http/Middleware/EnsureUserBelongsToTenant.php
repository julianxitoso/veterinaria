<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Impide que un token emitido para una clínica se use en otra.
 */
class EnsureUserBelongsToTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active || (int) $user->tenant_id !== $this->tenants->id()) {
            return response()->json(['message' => 'No autorizado para esta clínica.'], 403);
        }

        return $next($request);
    }
}
