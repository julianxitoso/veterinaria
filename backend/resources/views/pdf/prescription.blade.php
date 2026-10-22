@extends('pdf.layout')

@section('content')
    @include('pdf.partials.patient', ['pet' => $consultation->pet, 'weight' => $consultation->weight])

    @if ($consultation->diagnosis)
        <div class="section">
            <p class="section-title">Diagnóstico</p>
            <p class="pre">{{ $consultation->diagnosis }}</p>
        </div>
    @endif

    <div class="section">
        <p class="section-title">Fórmula médica</p>
        @forelse ($consultation->medications as $i => $m)
            <div style="margin-bottom: 8px;">
                <p><strong>{{ $i + 1 }}. {{ $m->name }}</strong>{{ $m->dose ? ' — ' . $m->dose : '' }}</p>
                <p class="muted">{{ collect([$m->route ? 'Vía ' . mb_strtolower($m->route) : null, $m->frequency, $m->duration ? 'durante ' . $m->duration : null])->filter()->join(' · ') }}</p>
                @if ($m->notes)<p>{{ $m->notes }}</p>@endif
            </div>
        @empty
            <p class="muted">Sin medicamentos formulados.</p>
        @endforelse
    </div>

    @if ($consultation->instructions)
        <div class="section">
            <p class="section-title">Indicaciones</p>
            <p class="pre">{{ $consultation->instructions }}</p>
        </div>
    @endif

    @if ($consultation->follow_up_date)
        <div class="section">
            <p class="section-title">Control</p>
            <p>Próximo control: <strong>{{ $consultation->follow_up_date->translatedFormat('l j \d\e F \d\e Y') }}</strong></p>
        </div>
    @endif

    <div class="signature">
        <strong>{{ $consultation->veterinarian->name }}</strong><br>
        <span class="muted small">Médico veterinario</span>
    </div>
@endsection
