<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Cada usuario gestiona sus propios datos y contraseña.
 */
class ProfileController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function update(Request $request): UserResource
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->where('tenant_id', $user->tenant_id)->ignore($user)],
        ]);

        $user->update($data);

        return new UserResource($user);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.current_password' => 'La contraseña actual no es correcta.',
        ]);

        $user = $request->user();
        $user->update(['password' => $request->input('password')]);

        // cierra las demás sesiones abiertas
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        $this->audit->log('auth.password_changed', $user, 'Cambió su contraseña');

        return response()->json(['message' => 'Contraseña actualizada.']);
    }
}
