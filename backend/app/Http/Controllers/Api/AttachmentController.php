<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'attachable_type' => ['required', Rule::in(['pet', 'consultation', 'clinical_record'])],
            'attachable_id' => ['required', 'integer'],
            'file' => [
                'required', 'file', 'max:10240', // 10 MB
                'mimes:pdf,jpg,jpeg,png,webp,gif,doc,docx,xls,xlsx,txt,csv',
            ],
        ]);

        // el scope por clínica impide adjuntar a registros de otra clínica
        $attachable = Relation::getMorphedModel($data['attachable_type'])::findOrFail($data['attachable_id']);
        $file = $request->file('file');

        $attachment = $attachable->attachments()->create([
            'user_id' => $request->user()->id,
            'name' => $file->getClientOriginalName(),
            'path' => $file->store("tenants/{$attachable->tenant_id}/attachments", 'local'),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return (new AttachmentResource($attachment))->response()->setStatusCode(201);
    }

    /**
     * Los adjuntos son privados: solo se descargan con sesión en la clínica.
     */
    public function download(Attachment $attachment): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($attachment->path), 404);

        return Storage::disk('local')->download($attachment->path, $attachment->name);
    }
}
