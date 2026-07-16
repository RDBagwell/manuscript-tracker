<?php

use App\Http\Controllers\AgencyController;
use App\Http\Controllers\AgentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ManuscriptController;
use App\Http\Controllers\QueryController;
use App\Http\Controllers\QueryEventController;
use Illuminate\Support\Facades\Route;

// Container health probe (nginx/compose) — intentionally unauthenticated.
Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:6,1');
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::put('/user', [AuthController::class, 'update']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('manuscripts', ManuscriptController::class);
    Route::apiResource('agencies', AgencyController::class);
    Route::apiResource('agents', AgentController::class);
    Route::apiResource('queries', QueryController::class);

    Route::post('/queries/{query}/events', [QueryEventController::class, 'store'])
        ->name('queries.events.store');
});
