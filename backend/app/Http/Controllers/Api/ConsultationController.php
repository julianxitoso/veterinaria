<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConsultationRequest;
use App\Http\Resources\ConsultationResource;
use App\Models\Consultation;
use App\Models\ConsultationExam;
use App\Services\ConsultationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ConsultationController extends Controller
{
    public function __construct(private ConsultationService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in([Consultation::STATUS_OPEN, Consultation::STATUS_CLOSED])],
        ]);

        $consultations = Consultation::query()
            ->with(['pet.client', 'veterinarian'])
            ->search($request->string('search')->toString())
            ->when($request->filled('pet_id'), fn ($q) => $q->where('pet_id', $request->integer('pet_id')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('consulted_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('consulted_at', '<=', $request->date('to')))
            ->latest('consulted_at')
            ->paginate($request->integer('per_page', 15));

        return ConsultationResource::collection($consultations);
    }

    public function store(ConsultationRequest $request): JsonResponse
    {
        $consultation = $this->service->create($request->validated(), $request->user());

        return (new ConsultationResource($this->loadDetail($consultation)))->response()->setStatusCode(201);
    }

    public function show(Consultation $consultation): ConsultationResource
    {
        return new ConsultationResource($this->loadDetail($consultation));
    }

    public function update(ConsultationRequest $request, Consultation $consultation): ConsultationResource
    {
        $this->service->update($consultation, $request->validated(), $request->user());

        return new ConsultationResource($this->loadDetail($consultation->refresh()));
    }

    public function close(Consultation $consultation): ConsultationResource
    {
        $this->service->close($consultation);

        return new ConsultationResource($this->loadDetail($consultation));
    }

    /**
     * Registra el resultado de un examen; se permite aunque la consulta esté cerrada.
     */
    public function updateExam(Request $request, Consultation $consultation, ConsultationExam $exam): ConsultationResource
    {
        abort_unless((int) $exam->consultation_id === $consultation->id, 404);

        $data = $request->validate([
            'result' => ['nullable', 'string', 'max:10000'],
            'status' => ['required', Rule::in([ConsultationExam::STATUS_REQUESTED, ConsultationExam::STATUS_COMPLETED])],
        ]);

        $exam->update([
            ...$data,
            'completed_at' => $data['status'] === ConsultationExam::STATUS_COMPLETED ? ($exam->completed_at ?? now()) : null,
        ]);

        return new ConsultationResource($this->loadDetail($consultation));
    }

    private function loadDetail(Consultation $consultation): Consultation
    {
        return $consultation->load([
            'pet.client',
            'veterinarian',
            'medications.product',
            'exams',
            'records' => fn ($q) => $q->active()->with(['author', 'attachments'])->oldest('recorded_at'),
            'attachments',
            'invoice',
        ]);
    }
}
