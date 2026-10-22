<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryMovementRequest;
use App\Http\Resources\MovementResource;
use App\Http\Resources\ProductResource;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class InventoryMovementController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    /**
     * Kardex general con filtros.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'type' => ['nullable', Rule::in(InventoryMovement::TYPES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $movements = InventoryMovement::query()
            ->with(['product', 'user'])
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('to')))
            ->latest('id')
            ->paginate($request->integer('per_page', 25));

        return MovementResource::collection($movements);
    }

    public function store(InventoryMovementRequest $request, Product $product): ProductResource
    {
        $data = $request->validated();

        $this->inventory->move(
            $product,
            $data['type'],
            (float) $data['quantity'],
            $request->user(),
            Arr::except($data, ['type', 'quantity']),
        );

        return new ProductResource($product->refresh()->load(['movements' => fn ($q) => $q->with('user')->latest('id')->limit(30)]));
    }
}
