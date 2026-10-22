<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\AuditLogger;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'filter' => ['nullable', Rule::in(['low_stock', 'expiring', 'inactive'])],
        ]);

        $filter = $request->input('filter');

        $products = Product::query()
            ->search($request->string('search')->toString())
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->when($filter === 'inactive', fn ($q) => $q->where('is_active', false), fn ($q) => $q->where('is_active', true))
            ->when($filter === 'low_stock', fn ($q) => $q->lowStock())
            ->when($filter === 'expiring', fn ($q) => $q->expiring()->orderBy('expires_at'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return ProductResource::collection($products);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = $this->inventory->createProduct($request->validated(), $request->user());

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(['movements' => fn ($q) => $q->with('user')->latest('id')->limit(30)]));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        // cambios de precio/costo y desactivaciones son sensibles
        $sensitive = collect(app(AuditLogger::class)->diff($product))->only(['price', 'cost', 'tax_rate', 'is_active'])->all();
        if ($sensitive) {
            app(AuditLogger::class)->log('product.updated', $product, "Modificó el producto {$product->name}", $sensitive);
        }

        return new ProductResource($product);
    }

    /**
     * Valores ya usados, para sugerir en los formularios.
     */
    public function options(): JsonResponse
    {
        $distinct = fn (string $column) => Product::whereNotNull($column)->distinct()->orderBy($column)->pluck($column);

        return response()->json(['data' => [
            'categories' => $distinct('category'),
            'suppliers' => $distinct('supplier'),
            'units' => $distinct('unit')->merge(['unidad', 'tableta', 'cápsula', 'ml', 'frasco', 'caja', 'dosis', 'sobre', 'kg'])->unique()->values(),
        ]]);
    }

    /**
     * Conteo de alertas para el tablero y el menú.
     */
    public function alerts(): JsonResponse
    {
        return response()->json(['data' => [
            'low_stock' => Product::where('is_active', true)->lowStock()->count(),
            'expiring' => Product::where('is_active', true)->expiring()->whereDate('expires_at', '>=', today())->count(),
            'expired' => Product::where('is_active', true)->expiring()->whereDate('expires_at', '<', today())->count(),
        ]]);
    }
}
