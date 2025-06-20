<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\TransactionController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\SecurityController;
use Illuminate\Support\Facades\Route;

// Admin Routes Group
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin', 'security', 'audit'])->group(function () {
    
    // Dashboard
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    
    // User Management
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserManagementController::class, 'index'])->name('index');
        Route::get('/{user}', [UserManagementController::class, 'show'])->name('show');
        Route::post('/{user}/suspend', [UserManagementController::class, 'suspend'])->name('suspend');
        Route::post('/{user}/unsuspend', [UserManagementController::class, 'unsuspend'])->name('unsuspend');
        Route::post('/{user}/ban', [UserManagementController::class, 'ban'])->name('ban');
        Route::post('/{user}/unban', [UserManagementController::class, 'unban'])->name('unban');
        Route::post('/{user}/balance', [UserManagementController::class, 'adjustBalance'])->name('balance.adjust');
        Route::post('/{user}/kyc/approve', [UserManagementController::class, 'approveKyc'])->name('kyc.approve');
        Route::post('/{user}/kyc/reject', [UserManagementController::class, 'rejectKyc'])->name('kyc.reject');
        Route::get('/{user}/history', [UserManagementController::class, 'history'])->name('history');
        Route::get('/export/csv', [UserManagementController::class, 'exportCsv'])->name('export.csv');
    });
    
    // Transaction Management
    Route::prefix('transactions')->name('transactions.')->group(function () {
        Route::get('/', [TransactionController::class, 'index'])->name('index');
        Route::get('/{transaction}', [TransactionController::class, 'show'])->name('show');
        Route::post('/{transaction}/approve', [TransactionController::class, 'approve'])->name('approve');
        Route::post('/{transaction}/reject', [TransactionController::class, 'reject'])->name('reject');
        Route::post('/{transaction}/refund', [TransactionController::class, 'refund'])->name('refund');
        Route::get('/pending/withdrawals', [TransactionController::class, 'pendingWithdrawals'])->name('pending.withdrawals');
        Route::post('/bulk/approve', [TransactionController::class, 'bulkApprove'])->name('bulk.approve');
        Route::get('/export/csv', [TransactionController::class, 'exportCsv'])->name('export.csv');
    });
    
    // System Settings
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        Route::post('/', [SettingsController::class, 'update'])->name('update');
        Route::get('/game', [SettingsController::class, 'gameSettings'])->name('game');
        Route::post('/game', [SettingsController::class, 'updateGameSettings'])->name('game.update');
        Route::get('/payment', [SettingsController::class, 'paymentSettings'])->name('payment');
        Route::post('/payment', [SettingsController::class, 'updatePaymentSettings'])->name('payment.update');
        Route::get('/security', [SettingsController::class, 'securitySettings'])->name('security');
        Route::post('/security', [SettingsController::class, 'updateSecuritySettings'])->name('security.update');
        Route::post('/maintenance/toggle', [SettingsController::class, 'toggleMaintenance'])->name('maintenance.toggle');
    });
    
    // Reports & Analytics
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportsController::class, 'index'])->name('index');
        Route::get('/financial', [ReportsController::class, 'financial'])->name('financial');
        Route::get('/users', [ReportsController::class, 'users'])->name('users');
        Route::get('/games', [ReportsController::class, 'games'])->name('games');
        Route::get('/revenue', [ReportsController::class, 'revenue'])->name('revenue');
        Route::post('/generate', [ReportsController::class, 'generate'])->name('generate');
        Route::get('/export/{type}', [ReportsController::class, 'export'])->name('export');
    });
    
    // Security & Logs
    Route::prefix('security')->name('security.')->group(function () {
        Route::get('/', [SecurityController::class, 'index'])->name('index');
        Route::get('/logs', [SecurityController::class, 'logs'])->name('logs');
        Route::get('/failed-logins', [SecurityController::class, 'failedLogins'])->name('failed-logins');
        Route::get('/suspicious', [SecurityController::class, 'suspicious'])->name('suspicious');
        Route::post('/ip/block', [SecurityController::class, 'blockIp'])->name('ip.block');
        Route::post('/ip/unblock', [SecurityController::class, 'unblockIp'])->name('ip.unblock');
        Route::get('/audit', [SecurityController::class, 'audit'])->name('audit');
    });
    
    // Real-time Data API for Admin Dashboard
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('/stats/live', [AdminDashboardController::class, 'getLiveStats'])->name('stats.live');
        Route::get('/transactions/recent', [AdminDashboardController::class, 'getRecentTransactions'])->name('transactions.recent');
        Route::get('/users/online', [AdminDashboardController::class, 'getOnlineUsers'])->name('users.online');
        Route::get('/games/active', [AdminDashboardController::class, 'getActiveGames'])->name('games.active');
        Route::get('/alerts', [AdminDashboardController::class, 'getAlerts'])->name('alerts');
    });
});

// Payment Provider Webhooks (No middleware to allow external access)
Route::prefix('webhook')->name('webhook.')->group(function () {
    Route::post('/plisio', [\App\Http\Controllers\PaymentController::class, 'plisioWebhook'])->name('plisio');
    Route::post('/primepag', [\App\Http\Controllers\PaymentController::class, 'primepagWebhook'])->name('primepag');
});

// API Routes for Admin Mobile App (if needed)
Route::prefix('api/admin')->name('api.admin.')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'apiDashboard']);
    Route::get('/users', [UserManagementController::class, 'apiUsers']);
    Route::get('/transactions', [TransactionController::class, 'apiTransactions']);
    Route::post('/transactions/{transaction}/approve', [TransactionController::class, 'apiApprove']);
    Route::post('/transactions/{transaction}/reject', [TransactionController::class, 'apiReject']);
    Route::get('/alerts', [AdminDashboardController::class, 'apiAlerts']);
});