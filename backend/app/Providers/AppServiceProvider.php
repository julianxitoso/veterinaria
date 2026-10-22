<?php

namespace App\Providers;

use App\Models\ClinicalRecord;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Pet;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // una instancia por petición (compatible con Octane/colas)
        $this->app->scoped(TenantManager::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // alias cortos para relaciones polimórficas (adjuntos); no se usa
        // enforceMorphMap porque spatie/permission guarda App\Models\User
        Relation::morphMap([
            'pet' => Pet::class,
            'consultation' => Consultation::class,
            'clinical_record' => ClinicalRecord::class,
            'invoice' => Invoice::class,
        ]);
    }
}
