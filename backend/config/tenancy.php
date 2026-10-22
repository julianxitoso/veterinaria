<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Dominio central
    |--------------------------------------------------------------------------
    |
    | Dominio base de la plataforma. Cada clínica vive en {slug}.{central_domain}.
    | Ej: con "app.com", la clínica "demo" se resuelve desde "demo.app.com".
    |
    */

    'central_domain' => env('TENANCY_CENTRAL_DOMAIN', 'app.com'),

    /*
    |--------------------------------------------------------------------------
    | Header de respaldo
    |--------------------------------------------------------------------------
    |
    | Si el host no trae subdominio (ej. localhost en desarrollo o la SPA
    | consumiendo la API desde otro dominio) se usa este header con el slug.
    |
    */

    'header' => 'X-Tenant',

];
