<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClientController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $clients = Client::query()
            ->search($request->string('search')->toString())
            ->withCount('pets')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return ClientResource::collection($clients);
    }

    public function store(ClientRequest $request): JsonResponse
    {
        $client = Client::create($request->validated());

        return (new ClientResource($client))->response()->setStatusCode(201);
    }

    public function show(Client $client): ClientResource
    {
        return new ClientResource($client->load(['pets' => fn ($q) => $q->orderBy('name')]));
    }

    public function update(ClientRequest $request, Client $client): ClientResource
    {
        $client->update($request->validated());

        return new ClientResource($client);
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->pets()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un cliente con mascotas registradas.',
            ], 422);
        }

        $client->delete();
        app(AuditLogger::class)->log('client.deleted', $client, "Eliminó el cliente {$client->name}");

        return response()->json(status: 204);
    }
}
