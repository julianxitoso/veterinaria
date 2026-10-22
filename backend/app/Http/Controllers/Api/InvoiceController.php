<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $invoices) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', Rule::in([Invoice::STATUS_DRAFT, Invoice::STATUS_ISSUED, Invoice::STATUS_VOIDED, 'pending'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $status = $request->input('status');

        $invoices = Invoice::query()
            ->with(['client', 'pet'])
            ->search($request->string('search')->toString())
            ->when($status === 'pending', fn ($q) => $q->where('status', Invoice::STATUS_ISSUED)->whereColumn('paid_total', '<', 'total'))
            ->when($status && $status !== 'pending', fn ($q) => $q->where('status', $status))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->integer('client_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('issued_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('issued_at', '<=', $request->date('to')))
            ->orderByRaw('issued_at is null desc')
            ->latest('issued_at')
            ->latest('id')
            ->paginate($request->integer('per_page', 20));

        return InvoiceResource::collection($invoices);
    }

    public function store(InvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoices->createDraft($request->validated(), $request->user());

        return (new InvoiceResource($this->loadDetail($invoice)))->response()->setStatusCode(201);
    }

    public function fromConsultation(Request $request, Consultation $consultation): InvoiceResource
    {
        $invoice = $this->invoices->fromConsultation($consultation, $request->user());

        return new InvoiceResource($this->loadDetail($invoice));
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($this->loadDetail($invoice));
    }

    public function update(InvoiceRequest $request, Invoice $invoice): InvoiceResource
    {
        $this->invoices->updateDraft($invoice, $request->validated());

        return new InvoiceResource($this->loadDetail($invoice->refresh()));
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $this->invoices->deleteDraft($invoice);

        return response()->json(status: 204);
    }

    public function issue(Request $request, Invoice $invoice): InvoiceResource
    {
        $data = $request->validate([
            'payment' => ['nullable', 'array'],
            'payment.amount' => ['required_with:payment', 'numeric', 'min:0'],
            'payment.method' => ['required_with:payment', Rule::in(Payment::METHODS)],
            'payment.reference' => ['nullable', 'string', 'max:255'],
        ]);

        $this->invoices->issue($invoice, $request->user(), $data['payment'] ?? null);

        return new InvoiceResource($this->loadDetail($invoice->refresh()));
    }

    public function addPayment(Request $request, Invoice $invoice): InvoiceResource
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $this->invoices->addPayment($invoice, $data, $request->user());

        return new InvoiceResource($this->loadDetail($invoice->refresh()));
    }

    public function void(Request $request, Invoice $invoice): InvoiceResource
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $this->invoices->void($invoice, $data['reason'], $request->user());

        return new InvoiceResource($this->loadDetail($invoice->refresh()));
    }

    private function loadDetail(Invoice $invoice): Invoice
    {
        return $invoice->load(['client', 'pet', 'user', 'items.product', 'payments.user']);
    }
}
