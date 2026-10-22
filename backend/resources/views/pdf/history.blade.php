@extends('pdf.layout')

@php
    $types = ['vaccine' => 'Vacuna', 'deworming' => 'Desparasitación', 'procedure' => 'Procedimiento', 'exam_result' => 'Resultado de examen', 'note' => 'Nota', 'evolution' => 'Evolución'];
@endphp

@section('content')
    @include('pdf.partials.patient', ['pet' => $pet])

    @if ($immunizations->isNotEmpty())
        <div class="section">
            <p class="section-title">Vacunas y desparasitaciones</p>
            <table class="lines">
                <thead><tr><th>Tipo</th><th>Producto</th><th>Aplicada</th><th>Próxima dosis</th></tr></thead>
                <tbody>
                    @foreach ($immunizations as $r)
                        <tr>
                            <td>{{ $types[$r->type] }}</td>
                            <td>{{ $r->title }}</td>
                            <td>{{ $r->recorded_at->format('d/m/Y') }}</td>
                            <td>{{ $r->next_date?->format('d/m/Y') ?? '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    <div class="section">
        <p class="section-title">Consultas ({{ $consultations->count() }})</p>
        @forelse ($consultations as $c)
            <div style="margin-bottom: 10px; page-break-inside: avoid;">
                <p><strong>{{ $c->consulted_at->format('d/m/Y') }} — {{ $c->reason }}</strong> <span class="muted">· {{ $c->veterinarian->name }}</span></p>
                @if ($c->diagnosis)<p><span class="muted">Diagnóstico:</span> {{ $c->diagnosis }}</p>@endif
                @if ($c->treatment)<p><span class="muted">Tratamiento:</span> {{ $c->treatment }}</p>@endif
                @if ($c->medications->isNotEmpty())
                    <p><span class="muted">Medicamentos:</span> {{ $c->medications->map(fn ($m) => trim($m->name . ' ' . $m->dose))->join(', ') }}</p>
                @endif
                @foreach ($c->records->where('type', 'evolution') as $r)
                    <p class="small"><span class="muted">Evolución {{ $r->recorded_at->format('d/m/Y') }}:</span> {{ $r->description }}</p>
                @endforeach
            </div>
        @empty
            <p class="muted">Sin consultas registradas.</p>
        @endforelse
    </div>

    @if ($others->isNotEmpty())
        <div class="section">
            <p class="section-title">Procedimientos y notas</p>
            @foreach ($others as $r)
                <p><strong>{{ $r->recorded_at->format('d/m/Y') }} — {{ $types[$r->type] ?? $r->type }}{{ $r->title ? ': ' . $r->title : '' }}</strong></p>
                <p class="pre" style="margin-bottom: 6px;">{{ $r->description }}</p>
            @endforeach
        </div>
    @endif
@endsection
