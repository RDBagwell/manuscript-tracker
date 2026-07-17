<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
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
