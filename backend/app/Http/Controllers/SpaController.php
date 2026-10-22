<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * Entrega el index.html del frontend compilado e inyecta la configuración
 * que depende del servidor (dominio central), para no recompilar al cambiarla.
 */
class SpaController extends Controller
{
    public function __invoke(): Response
    {
        $index = public_path('spa/index.html');

        abort_unless(is_file($index), 503, 'El frontend no está compilado (falta public/spa).');

        $config = json_encode([
            'centralDomain' => config('tenancy.central_domain'),
        ], JSON_UNESCAPED_SLASHES);

        $html = str_replace(
            '</head>',
            "<script>window.APP_CONFIG = {$config};</script></head>",
            file_get_contents($index),
        );

        return response($html)->header('Cache-Control', 'no-cache');
    }
}
