<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TenantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_url' => $this->logo_path ? Storage::url($this->logo_path) : null,
            'primary_color' => $this->setting('branding.primary_color', '#0d9488'),
            'plan' => $this->plan,
            'online_booking' => (bool) $this->setting('appointments.online_enabled', true),
        ];
    }
}
