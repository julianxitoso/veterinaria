@extends('pdf.layout')

@php
    $money = fn ($v) => '$' . number_format((float) $v, 0, ',', '.');
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2, ',', '.'), '0'), ',');
    $methods = ['cash' => 'Efectivo', 'card' => 'Tarjeta', 'transfer' => 'Transferencia', 'nequi' => 'Nequi', 'daviplata' => 'Daviplata', 'other' => 'Otro'];
@endphp

@section('content')
    @if ($invoice->status === 'voided')
        <div class="watermark">ANULADA</div>
    @elseif ($invoice->status === 'draft')
        <div class="watermark">BORRADOR</div>
    @endif

    <table class="grid">
        <tr>
            <td style="width: 50%;">
                <p class="label">Cliente</p>
                <p><strong>{{ $invoice->client->name }}</strong></p>
                @if ($invoice->client->document)<p>{{ $invoice->client->document_type }} {{ $invoice->client->document }}</p>@endif
                <p>{{ collect([$invoice->client->phone, $invoice->client->email])->filter()->join(' · ') }}</p>
                @if ($invoice->client->address)<p>{{ $invoice->client->address }}{{ $invoice->client->city ? ', ' . $invoice->client->city : '' }}</p>@endif
            </td>
            <td>
                @if ($invoice->pet)
                    <p class="label">Paciente</p>
                    <p><strong>{{ $invoice->pet->name }}</strong> ({{ $invoice->pet->species }})</p>
                @endif
                <p class="label" style="margin-top: 4px;">Atendió</p>
                <p>{{ $invoice->user->name }}</p>
            </td>
        </tr>
    </table>

    <table class="lines section">
        <thead>
            <tr>
                <th>Descripción</th>
                <th class="right" style="width: 50px;">Cant.</th>
                <th class="right" style="width: 75px;">Precio</th>
                <th class="right" style="width: 45px;">Dto.</th>
                <th class="right" style="width: 40px;">IVA</th>
                <th class="right" style="width: 80px;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="right">{{ $qty($item->quantity) }}</td>
                    <td class="right">{{ $money($item->unit_price) }}</td>
                    <td class="right">{{ (float) $item->discount_pct > 0 ? $qty($item->discount_pct) . '%' : '—' }}</td>
                    <td class="right">{{ $qty($item->tax_rate) }}%</td>
                    <td class="right">{{ $money($item->total) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table style="margin-top: 10px;">
        <tr>
            <td style="width: 55%; vertical-align: top;">
                @if ($invoice->payments->isNotEmpty())
                    <p class="label">Pagos</p>
                    @foreach ($invoice->payments as $payment)
                        <p>{{ $payment->paid_at->format('d/m/Y') }} · {{ $methods[$payment->method] ?? $payment->method }}{{ $payment->reference ? ' (' . $payment->reference . ')' : '' }}: {{ $money($payment->amount) }}</p>
                    @endforeach
                @endif
                @if ($invoice->notes)
                    <p class="label" style="margin-top: 6px;">Observaciones</p>
                    <p class="pre">{{ $invoice->notes }}</p>
                @endif
                @if ($invoice->status === 'voided')
                    <p class="alert" style="margin-top: 6px;">Anulada el {{ $invoice->voided_at->format('d/m/Y') }}: {{ $invoice->void_reason }}</p>
                @endif
            </td>
            <td>
                <table class="totals">
                    <tr><td class="muted">Subtotal</td><td class="right">{{ $money($invoice->subtotal) }}</td></tr>
                    @if ((float) $invoice->discount_total > 0)
                        <tr><td class="muted">Descuento</td><td class="right">-{{ $money($invoice->discount_total) }}</td></tr>
                    @endif
                    <tr><td class="muted">IVA</td><td class="right">{{ $money($invoice->tax_total) }}</td></tr>
                    <tr class="grand"><td>TOTAL</td><td class="right">{{ $money($invoice->total) }}</td></tr>
                    @if ($invoice->status === 'issued')
                        <tr><td class="muted">Pagado</td><td class="right">{{ $money($invoice->paid_total) }}</td></tr>
                        <tr><td><strong>Saldo</strong></td><td class="right"><strong>{{ $money($invoice->balance()) }}</strong></td></tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>
@endsection
