<?php

namespace App\Providers;

use App\Models\Agent;
use App\Models\Manuscript;
use App\Models\Query;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Aliases in the database instead of class names: survives model
        // renames and reads cleaner in every query. Enforced, so an
        // unmapped morph is a loud error rather than silent FQCN drift.
        Relation::enforceMorphMap([
            'query' => Query::class,
            'manuscript' => Manuscript::class,
            'agent' => Agent::class,
        ]);

        // The reset email must deep-link into the SPA — Laravel's default
        // points at a 'password.reset' web route this API doesn't have.
        // APP_URL tracks NGINX_PORT, so the link lands on the right origin.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            return config('app.url')
                .'/reset-password?token='.$token
                .'&email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
