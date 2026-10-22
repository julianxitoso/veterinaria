{{-- datos del paciente y su dueño; espera $pet (con client) --}}
<table class="grid">
    <tr>
        <td style="width: 50%;">
            <p class="label">Paciente</p>
            <p><strong>{{ $pet->name }}</strong></p>
            <p>{{ collect([$pet->species, $pet->breed, ['male' => 'Macho', 'female' => 'Hembra'][$pet->sex] ?? null, $pet->age])->filter()->join(' · ') }}</p>
            @if ($pet->weight)<p>Peso: {{ rtrim(rtrim(number_format($weight ?? $pet->weight, 2, ',', '.'), '0'), ',') }} kg</p>@endif
        </td>
        <td>
            <p class="label">Propietario</p>
            <p><strong>{{ $pet->client->name }}</strong></p>
            @if ($pet->client->document)<p>{{ $pet->client->document_type }} {{ $pet->client->document }}</p>@endif
            <p>{{ collect([$pet->client->phone, $pet->client->email])->filter()->join(' · ') }}</p>
        </td>
    </tr>
</table>
@if ($pet->allergies)
    <p class="alert" style="margin-top: 6px;"><strong>Alergias:</strong> {{ $pet->allergies }}</p>
@endif
