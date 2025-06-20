<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;

/*
|--------------------------------------------------------------------------
| API Routes for Memory Game
|--------------------------------------------------------------------------
|
| Add these routes to your routes/api.php file or create separate game routes
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    // Game API Routes
    Route::get('/user/balance', [GameController::class, 'getUserBalance']);
    Route::post('/game/memory/start', [GameController::class, 'startGame']);
    Route::post('/game/memory/result/{sessionId}', [GameController::class, 'updateResult']);
    Route::get('/game/memory/history', [GameController::class, 'getGameHistory']);
});

/*
|--------------------------------------------------------------------------
| Web Routes for Memory Game
|--------------------------------------------------------------------------
|
| Add this route to your routes/web.php file
|
*/

// Route::middleware(['auth'])->group(function () {
//     Route::get('/memory-game', [GameController::class, 'index'])->name('memory-game');
// });