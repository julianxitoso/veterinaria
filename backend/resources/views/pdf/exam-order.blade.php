@extends('pdf.layout')

@section('content')
    @include('pdf.partials.patient', ['pet' => $consultation->pet, 'weight' => $consultation->weight])

    <div class="section">
        <p class="section-title">Motivo / impresión diagnóstica</p>
        <p class="pre">{{ $consultation->diagnosis ?: $consultation->reason }}</p>
    </div>

    <div class="section">
        <p class="section-title">Exámenes solicitados</p>
        <table class="lines">
            <thead>
                <tr><th style="width: 25px;">#</th><th>Examen</th><th>Observaciones</th></tr>
            </thead>
            <tbody>
                @foreach ($consultation->exams as $i => $exam)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td><strong>{{ $exam->name }}</strong></td>
                        <td>{{ $exam->notes }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="signature">
        <strong>{{ $consultation->veterinarian->name }}</strong><br>
        <span class="muted small">Médico veterinario</span>
    </div>
@endsection
