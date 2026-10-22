<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

/*
| La aplicación React compilada (public/spa) se sirve desde aquí para
| cualquier ruta que no sea de la API: así frontend y API comparten
| dominio y el servidor no necesita Node.
*/
Route::get('/{path?}', SpaController::class)
    ->where('path', '^(?!api/|storage/|up$).*$');
