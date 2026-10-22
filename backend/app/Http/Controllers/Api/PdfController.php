<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Pet;
use App\Tenancy\TenantManager;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Documentos imprimibles con la marca de la clínica.
 */
class PdfController extends Controller
{
    public function __construct(private TenantManager $tenants) {}

    public function invoice(Invoice $invoice): Response
    {
        $invoice->load(['client', 'pet', 'user', 'items', 'payments']);

        return $this->render('pdf.invoice', [
            'title' => $invoice->isDraft() ? 'Borrador de factura' : 'Factura de venta',
            'number' => $invoice->number ?? 'Sin número',
            'date' => ($invoice->issued_at ?? $invoice->created_at)->format('d/m/Y h:i a'),
            'invoice' => $invoice,
        ], 'factura-'.($invoice->number ?? "borrador-{$invoice->id}"));
    }

    public function prescription(Consultation $consultation): Response
    {
        $consultation->load(['pet.client', 'veterinarian', 'medications']);

        return $this->render('pdf.prescription', [
            'title' => 'Fórmula médica',
            'date' => $consultation->consulted_at->format('d/m/Y'),
            'consultation' => $consultation,
        ], 'receta-'.Str::slug($consultation->pet->name).'-'.$consultation->consulted_at->format('Ymd'));
    }

    public function examOrder(Consultation $consultation): Response
    {
        $consultation->load(['pet.client', 'veterinarian', 'exams']);
        abort_if($consultation->exams->isEmpty(), 404, 'La consulta no tiene exámenes solicitados.');

        return $this->render('pdf.exam-order', [
            'title' => 'Orden de exámenes',
            'date' => $consultation->consulted_at->format('d/m/Y'),
            'consultation' => $consultation,
        ], 'orden-examenes-'.Str::slug($consultation->pet->name).'-'.$consultation->consulted_at->format('Ymd'));
    }

    public function history(Pet $pet): Response
    {
        $pet->load('client');

        $records = $pet->clinicalRecords()->active()->oldest('recorded_at')->get();

        return $this->render('pdf.history', [
            'title' => 'Historia clínica',
            'date' => now()->format('d/m/Y'),
            'pet' => $pet,
            'consultations' => $pet->consultations()->with(['veterinarian', 'medications', 'records' => fn ($q) => $q->active()])->latest('consulted_at')->get(),
            'immunizations' => $records->whereIn('type', ['vaccine', 'deworming'])->sortByDesc('recorded_at')->values(),
            'others' => $records->whereIn('type', ['procedure', 'note', 'exam_result'])->whereNull('consultation_id')->sortByDesc('recorded_at')->values(),
        ], 'historia-clinica-'.Str::slug($pet->name));
    }

    private function render(string $view, array $data, string $filename): Response
    {
        $tenant = $this->tenants->get();

        return Pdf::loadView($view, [
            ...$data,
            'tenant' => $tenant,
            'color' => $tenant->setting('branding.primary_color', '#0d9488'),
            'logo' => $this->logoDataUri($tenant->logo_path),
            'footer' => $view === 'pdf.invoice' ? $tenant->setting('invoicing.footer', BillingSettingsController::DEFAULT_FOOTER) : null,
        ])
            // incrusta solo los caracteres usados: ~900 KB → ~30 KB por documento
            ->setOption('isFontSubsettingEnabled', true)
            ->setPaper('letter')
            ->stream("{$filename}.pdf");
    }

    /**
     * Dompdf no lee URLs locales de forma fiable: el logo se incrusta en base64.
     */
    private function logoDataUri(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $mime = Storage::disk('public')->mimeType($path);

        return "data:{$mime};base64,".base64_encode(Storage::disk('public')->get($path));
    }
}
