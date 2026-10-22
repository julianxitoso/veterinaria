<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 28px 36px 60px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; line-height: 1.45; }
        h1, h2, h3, p { margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        .header td { vertical-align: top; }
        .clinic-name { font-size: 16px; font-weight: bold; color: {{ $color }}; }
        .muted { color: #64748b; }
        .small { font-size: 9px; }
        .doc-box { border: 1.5px solid {{ $color }}; border-radius: 6px; padding: 8px 12px; text-align: right; }
        .doc-title { font-size: 13px; font-weight: bold; color: {{ $color }}; text-transform: uppercase; }
        .doc-number { font-size: 15px; font-weight: bold; }
        .rule { border-top: 2px solid {{ $color }}; margin: 12px 0; }
        .section { margin-top: 14px; }
        .section-title { font-size: 11px; font-weight: bold; color: {{ $color }}; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; }
        .grid td { padding: 2px 8px 2px 0; vertical-align: top; }
        .label { color: #64748b; font-size: 9px; text-transform: uppercase; }
        .lines th { background: {{ $color }}; color: #fff; font-size: 9.5px; text-align: left; padding: 6px; }
        .lines td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .right { text-align: right; }
        .center { text-align: center; }
        .totals td { padding: 3px 6px; }
        .totals .grand td { font-size: 13px; font-weight: bold; border-top: 2px solid {{ $color }}; padding-top: 6px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 6px 8px; border-radius: 4px; }
        .pre { white-space: pre-line; }
        .signature { margin-top: 50px; width: 220px; border-top: 1px solid #94a3b8; padding-top: 4px; text-align: center; }
        .footer { position: fixed; bottom: -40px; left: 0; right: 0; text-align: center; font-size: 8.5px; color: #94a3b8; }
        .watermark { position: fixed; top: 35%; left: 10%; font-size: 90px; color: rgba(220, 38, 38, 0.12); transform: rotate(-30deg); font-weight: bold; }
    </style>
</head>
<body>
    <div class="footer">
        {{ $footer ?? '' }}
        @if (! empty($footer)) · @endif
        Generado el {{ now()->format('d/m/Y h:i a') }}
    </div>

    <table class="header">
        <tr>
            <td style="width: 62%;">
                @if ($logo)
                    <img src="{{ $logo }}" style="max-height: 55px; max-width: 160px; margin-bottom: 4px;"><br>
                @endif
                <p class="clinic-name">{{ $tenant->name }}</p>
                @if ($tenant->legal_name)<p>{{ $tenant->legal_name }}</p>@endif
                @if ($tenant->tax_id)<p>NIT {{ $tenant->tax_id }}</p>@endif
                <p class="muted">
                    {{ collect([$tenant->address, $tenant->phone, $tenant->email])->filter()->join(' · ') }}
                </p>
            </td>
            <td>
                <div class="doc-box">
                    <p class="doc-title">{{ $title }}</p>
                    @isset($number)<p class="doc-number">{{ $number }}</p>@endisset
                    @isset($date)<p class="muted">{{ $date }}</p>@endisset
                </div>
            </td>
        </tr>
    </table>

    <div class="rule"></div>

    @yield('content')
</body>
</html>
