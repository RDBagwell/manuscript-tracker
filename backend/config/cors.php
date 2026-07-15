<?php

/*
 * Same-origin through nginx (http://localhost) needs none of this; it
 * exists so the Vite dev server on :3000 can talk to the API directly
 * with cookies. supports_credentials + explicit origins is the pair the
 * browser requires for credentialed cross-origin requests.
 */
return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('APP_URL', 'http://localhost'),
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
