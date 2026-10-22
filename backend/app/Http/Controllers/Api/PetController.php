<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PetRequest;
use App\Http\Resources\PetResource;
use App\Models\Pet;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class PetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $pets = Pet::query()
            ->with('client')
            ->search($request->string('search')->toString())
            ->when($request->filled('species'), fn ($q) => $q->where('species', $request->input('species')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return PetResource::collection($pets);
    }

    public function store(PetRequest $request): JsonResponse
    {
        $pet = Pet::create($request->validated());

        return (new PetResource($pet->load('client')))->response()->setStatusCode(201);
    }

    public function show(Pet $pet): PetResource
    {
        return new PetResource($pet->load('client'));
    }

    public function update(PetRequest $request, Pet $pet): PetResource
    {
        $pet->update($request->validated());

        return new PetResource($pet->load('client'));
    }

    public function destroy(Pet $pet): JsonResponse
    {
        // borrado lógico: la historia clínica se conserva
        $pet->delete();
        app(AuditLogger::class)->log('pet.deleted', $pet, "Eliminó la mascota {$pet->name}");

        return response()->json(status: 204);
    }

    public function updatePhoto(Request $request, Pet $pet): PetResource
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:4096'],
        ]);

        if ($pet->photo_path) {
            Storage::disk('public')->delete($pet->photo_path);
        }

        $pet->update([
            'photo_path' => $request->file('photo')->store("tenants/{$pet->tenant_id}/pets", 'public'),
        ]);

        return new PetResource($pet->load('client'));
    }
}
