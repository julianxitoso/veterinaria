<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\PublicBookingController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\ClinicSettingsController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingSettingsController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ClinicalHistoryController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InventoryMovementController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\VeterinarianController;
use Illuminate\Support\Facades\Route;

/*
| Todas las rutas de la API se ejecutan en el contexto de una clínica,
| detectada por subdominio o por el header X-Tenant.
*/
Route::middleware('tenant')->group(function () {
    Route::get('/tenant', [TenantController::class, 'show']);

    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1');

    // agenda en línea pública (sin sesión)
    Route::prefix('public/booking')->group(function () {
        Route::get('/', [PublicBookingController::class, 'options'])->middleware('throttle:60,1');
        Route::get('/slots', [PublicBookingController::class, 'slots'])->middleware('throttle:60,1');
        Route::post('/', [PublicBookingController::class, 'store'])->middleware('throttle:5,1');
    });

    Route::middleware(['auth:sanctum', 'tenant.user'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::get('/dashboard', DashboardController::class);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // clientes y mascotas comparten los permisos del módulo "pacientes"
        Route::get('/clients', [ClientController::class, 'index'])->middleware('permission:pacientes.ver');
        Route::post('/clients', [ClientController::class, 'store'])->middleware('permission:pacientes.crear');
        Route::get('/clients/{client}', [ClientController::class, 'show'])->middleware('permission:pacientes.ver');
        Route::put('/clients/{client}', [ClientController::class, 'update'])->middleware('permission:pacientes.editar');
        Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->middleware('permission:pacientes.eliminar');

        Route::get('/pets', [PetController::class, 'index'])->middleware('permission:pacientes.ver');
        Route::post('/pets', [PetController::class, 'store'])->middleware('permission:pacientes.crear');
        Route::get('/pets/{pet}', [PetController::class, 'show'])->middleware('permission:pacientes.ver');
        Route::put('/pets/{pet}', [PetController::class, 'update'])->middleware('permission:pacientes.editar');
        Route::post('/pets/{pet}/photo', [PetController::class, 'updatePhoto'])->middleware('permission:pacientes.editar');
        Route::delete('/pets/{pet}', [PetController::class, 'destroy'])->middleware('permission:pacientes.eliminar');

        // consultas e historia clínica (no hay rutas de borrado: solo se archiva)
        Route::get('/veterinarians', [VeterinarianController::class, 'index'])->middleware('permission:consultas.ver');

        Route::get('/consultations', [ConsultationController::class, 'index'])->middleware('permission:consultas.ver');
        Route::post('/consultations', [ConsultationController::class, 'store'])->middleware('permission:consultas.crear');
        Route::get('/consultations/{consultation}', [ConsultationController::class, 'show'])->middleware('permission:consultas.ver');
        Route::put('/consultations/{consultation}', [ConsultationController::class, 'update'])->middleware('permission:consultas.editar');
        Route::post('/consultations/{consultation}/close', [ConsultationController::class, 'close'])->middleware('permission:consultas.editar');
        Route::put('/consultations/{consultation}/exams/{exam}', [ConsultationController::class, 'updateExam'])->middleware('permission:consultas.editar');

        Route::get('/pets/{pet}/history', [ClinicalHistoryController::class, 'index'])->middleware('permission:consultas.ver');
        Route::get('/pets/{pet}/clinical-summary', [ClinicalHistoryController::class, 'summary'])->middleware('permission:consultas.ver');
        Route::post('/pets/{pet}/records', [ClinicalHistoryController::class, 'store'])->middleware('permission:consultas.crear');
        Route::post('/records/{record}/archive', [ClinicalHistoryController::class, 'archive'])->middleware('permission:consultas.editar');

        Route::post('/attachments', [AttachmentController::class, 'store'])->middleware('permission:consultas.crear');
        Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->middleware('permission:consultas.ver');

        // inventario (no se borran productos: se desactivan)
        Route::get('/products/options', [ProductController::class, 'options'])->middleware('permission:inventario.ver');
        Route::get('/products/alerts', [ProductController::class, 'alerts'])->middleware('permission:inventario.ver');
        // el buscador de productos en la consulta lo usan también los veterinarios
        Route::get('/products', [ProductController::class, 'index'])->middleware('permission:inventario.ver|consultas.crear');
        Route::post('/products', [ProductController::class, 'store'])->middleware('permission:inventario.crear');
        Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:inventario.ver');
        Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:inventario.editar');
        Route::post('/products/{product}/movements', [InventoryMovementController::class, 'store'])->middleware('permission:inventario.mover-stock');
        Route::get('/inventory/movements', [InventoryMovementController::class, 'index'])->middleware('permission:inventario.ver');

        // facturación
        Route::get('/services', [ServiceController::class, 'index'])->middleware('permission:facturas.ver');
        Route::post('/services', [ServiceController::class, 'store'])->middleware('permission:configuracion.editar');
        Route::put('/services/{service}', [ServiceController::class, 'update'])->middleware('permission:configuracion.editar');

        Route::get('/billing/settings', [BillingSettingsController::class, 'show'])->middleware('permission:configuracion.ver');
        Route::put('/billing/settings', [BillingSettingsController::class, 'update'])->middleware('permission:configuracion.editar');

        // administración de la clínica
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::put('/profile/password', [ProfileController::class, 'updatePassword']);

        Route::get('/settings/clinic', [ClinicSettingsController::class, 'show'])->middleware('permission:configuracion.ver');
        Route::put('/settings/clinic', [ClinicSettingsController::class, 'update'])->middleware('permission:configuracion.editar');
        Route::post('/settings/clinic/logo', [ClinicSettingsController::class, 'uploadLogo'])->middleware('permission:configuracion.editar');
        Route::delete('/settings/clinic/logo', [ClinicSettingsController::class, 'deleteLogo'])->middleware('permission:configuracion.editar');

        Route::get('/users', [UserController::class, 'index'])->middleware('permission:usuarios.ver');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:usuarios.crear');
        Route::put('/users/{id}', [UserController::class, 'update'])->middleware('permission:usuarios.editar')->whereNumber('id');

        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:usuarios.ver');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:usuarios.editar');
        Route::put('/roles/{id}', [RoleController::class, 'update'])->middleware('permission:usuarios.editar')->whereNumber('id');

        // citas
        Route::get('/appointments', [AppointmentController::class, 'index'])->middleware('permission:citas.ver');
        Route::get('/appointments/day', [AppointmentController::class, 'day'])->middleware('permission:citas.ver');
        Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('permission:citas.crear');
        Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->middleware('permission:citas.editar');
        Route::post('/appointments/{appointment}/status', [AppointmentController::class, 'changeStatus'])->middleware('permission:citas.editar');

        Route::get('/schedules', [ScheduleController::class, 'index'])->middleware('permission:citas.ver');
        Route::put('/schedules/{userId}', [ScheduleController::class, 'update'])->middleware('permission:configuracion.editar')->whereNumber('userId');
        Route::put('/settings/appointments', [ScheduleController::class, 'updateSettings'])->middleware('permission:configuracion.editar');

        // la auditoría solo la ve quien administra la configuración
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:configuracion.editar');

        Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('permission:facturas.ver');
        Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:facturas.crear');
        Route::post('/consultations/{consultation}/invoice', [InvoiceController::class, 'fromConsultation'])->middleware('permission:facturas.crear');
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->middleware('permission:facturas.ver');
        Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:facturas.crear');
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('permission:facturas.crear');
        Route::post('/invoices/{invoice}/issue', [InvoiceController::class, 'issue'])->middleware('permission:facturas.crear');
        Route::post('/invoices/{invoice}/payments', [InvoiceController::class, 'addPayment'])->middleware('permission:facturas.crear');
        Route::post('/invoices/{invoice}/void', [InvoiceController::class, 'void'])->middleware('permission:facturas.cerrar');

        // documentos PDF
        Route::get('/invoices/{invoice}/pdf', [PdfController::class, 'invoice'])->middleware('permission:facturas.ver');
        Route::get('/consultations/{consultation}/prescription.pdf', [PdfController::class, 'prescription'])->middleware('permission:consultas.ver');
        Route::get('/consultations/{consultation}/exam-order.pdf', [PdfController::class, 'examOrder'])->middleware('permission:consultas.ver');
        Route::get('/pets/{pet}/history.pdf', [PdfController::class, 'history'])->middleware('permission:consultas.ver');
    });
});
