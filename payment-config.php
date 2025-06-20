<?php

// config/services.php additions
return [
    'plisio' => [
        'api_key' => env('PLISIO_API_KEY'),
        'secret_key' => env('PLISIO_SECRET_KEY'),
        'webhook_url' => env('APP_URL') . '/webhook/plisio',
    ],

    'primepag' => [
        'client_id' => env('PRIMEPAG_CLIENT_ID'),
        'client_secret' => env('PRIMEPAG_CLIENT_SECRET'),
        'webhook_url' => env('APP_URL') . '/webhook/primepag',
        'environment' => env('PRIMEPAG_ENVIRONMENT', 'production'), // sandbox or production
    ],
];

// Service Provider Registration
// app/Providers/AppServiceProvider.php
class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(PlisioService::class, function ($app) {
            return new PlisioService();
        });

        $this->app->singleton(PrimepagService::class, function ($app) {
            return new PrimepagService();
        });
    }

    public function boot()
    {
        // Boot logic
    }
}

// Database Seeders for Payment Methods
// database/seeders/PaymentMethodSeeder.php
use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    public function run()
    {
        $methods = [
            [
                'name' => 'USDT BEP-20',
                'type' => 'crypto',
                'provider' => 'plisio',
                'currency' => 'USDT',
                'is_active' => true,
                'min_amount' => 10.00,
                'max_amount' => 100000.00,
                'fee_percentage' => 1.0,
                'fee_fixed' => 0.00,
                'config' => [
                    'network' => 'BEP20',
                    'confirmations' => 3,
                    'supports_withdrawal' => true,
                ]
            ],
            [
                'name' => 'PIX',
                'type' => 'pix',
                'provider' => 'primepag',
                'currency' => 'BRL',
                'is_active' => true,
                'min_amount' => 10.00,
                'max_amount' => 50000.00,
                'fee_percentage' => 2.5,
                'fee_fixed' => 0.00,
                'config' => [
                    'instant' => true,
                    'supports_withdrawal' => true,
                    'requires_document' => true,
                ]
            ],
            [
                'name' => 'Bitcoin',
                'type' => 'crypto',
                'provider' => 'plisio',
                'currency' => 'BTC',
                'is_active' => false, // Disabled by default
                'min_amount' => 50.00,
                'max_amount' => 200000.00,
                'fee_percentage' => 0.5,
                'fee_fixed' => 5.00,
                'config' => [
                    'network' => 'BTC',
                    'confirmations' => 6,
                    'supports_withdrawal' => true,
                ]
            ],
        ];

        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(
                ['name' => $method['name'], 'provider' => $method['provider']],
                $method
            );
        }
    }
}

// API Routes for Payment System
// routes/api.php additions
Route::middleware(['auth:sanctum'])->prefix('payment')->group(function () {
    Route::get('/methods', [PaymentController::class, 'getPaymentMethods']);
    Route::post('/deposit', [PaymentController::class, 'createDeposit']);
    Route::post('/withdrawal', [PaymentController::class, 'createWithdrawal']);
    Route::get('/history', [PaymentController::class, 'getTransactionHistory']);
    Route::get('/transaction/{id}', [PaymentController::class, 'getTransactionDetails']);
});

// Admin routes for payment management
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin/payment')->group(function () {
    Route::post('/withdrawal/{id}/process', [PaymentController::class, 'processWithdrawal']);
    Route::get('/methods', [PaymentController::class, 'getPaymentMethodsAdmin']);
    Route::post('/methods', [PaymentController::class, 'createPaymentMethod']);
    Route::put('/methods/{id}', [PaymentController::class, 'updatePaymentMethod']);
    Route::delete('/methods/{id}', [PaymentController::class, 'deletePaymentMethod']);
});

// Environment Variables Template
/*
# .env additions

# Plisio Configuration
PLISIO_API_KEY=your_plisio_api_key_here
PLISIO_SECRET_KEY=your_plisio_secret_key_here

# PRIMEPAG Configuration  
PRIMEPAG_CLIENT_ID=your_primepag_client_id_here
PRIMEPAG_CLIENT_SECRET=your_primepag_client_secret_here
PRIMEPAG_ENVIRONMENT=production

# Payment System Settings
PAYMENT_AUTO_APPROVAL=false
PAYMENT_REQUIRE_KYC=true
PAYMENT_DAILY_WITHDRAWAL_LIMIT=50000
PAYMENT_MIN_WITHDRAWAL=10
PAYMENT_MAX_WITHDRAWAL=100000
*/

// Queue Jobs for Payment Processing
// app/Jobs/ProcessPaymentJob.php
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessPaymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $transaction;
    protected $paymentMethod;

    public function __construct(Transaction $transaction, PaymentMethod $paymentMethod)
    {
        $this->transaction = $transaction;
        $this->paymentMethod = $paymentMethod;
    }

    public function handle()
    {
        if ($this->paymentMethod->provider === 'plisio') {
            $service = app(PlisioService::class);
        } elseif ($this->paymentMethod->provider === 'primepag') {
            $service = app(PrimepagService::class);
        } else {
            throw new \Exception('Unsupported payment provider');
        }

        if ($this->transaction->type === 'withdrawal') {
            $result = $service->processWithdrawal($this->transaction, $this->paymentMethod);
        } else {
            throw new \Exception('Invalid transaction type for processing');
        }

        if ($result['success']) {
            $this->transaction->update([
                'status' => 'processing',
                'payment_id' => $result['payment_id'] ?? null,
                'processed_at' => now(),
                'metadata' => array_merge($this->transaction->metadata, $result['metadata'] ?? [])
            ]);
        } else {
            $this->transaction->update([
                'status' => 'failed',
                'metadata' => array_merge($this->transaction->metadata, [
                    'error' => $result['message'],
                    'failed_at' => now()
                ])
            ]);

            // Refund balance if withdrawal failed
            if ($this->transaction->type === 'withdrawal') {
                $this->transaction->user->increment('balance', $this->transaction->amount);
            }
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error('Payment processing job failed', [
            'transaction_id' => $this->transaction->id,
            'error' => $exception->getMessage()
        ]);

        $this->transaction->update([
            'status' => 'failed',
            'metadata' => array_merge($this->transaction->metadata, [
                'error' => $exception->getMessage(),
                'failed_at' => now()
            ])
        ]);

        // Refund balance if withdrawal failed
        if ($this->transaction->type === 'withdrawal') {
            $this->transaction->user->increment('balance', $this->transaction->amount);
        }
    }
}

// Payment Verification Command
// app/Console/Commands/VerifyPaymentsCommand.php
use Illuminate\Console\Command;

class VerifyPaymentsCommand extends Command
{
    protected $signature = 'payments:verify';
    protected $description = 'Verify pending payments status';

    public function handle()
    {
        $pendingTransactions = Transaction::where('status', 'pending')
            ->where('created_at', '>', now()->subHours(24))
            ->get();

        foreach ($pendingTransactions as $transaction) {
            $paymentMethod = PaymentMethod::find($transaction->metadata['payment_method_id']);
            
            if (!$paymentMethod) continue;

            try {
                if ($paymentMethod->provider === 'plisio') {
                    $service = app(PlisioService::class);
                    $status = $service->checkPaymentStatus($transaction->payment_id);
                } elseif ($paymentMethod->provider === 'primepag') {
                    $service = app(PrimepagService::class);
                    $status = $service->checkPaymentStatus($transaction->payment_id);
                }

                if (isset($status) && $status !== $transaction->status) {
                    $this->info("Updating transaction {$transaction->id} status from {$transaction->status} to {$status}");
                    
                    $transaction->update(['status' => $status]);
                    
                    if ($status === 'completed' && $transaction->type === 'deposit') {
                        $transaction->user->increment('balance', $transaction->amount);
                    }
                }
            } catch (\Exception $e) {
                $this->error("Failed to check status for transaction {$transaction->id}: " . $e->getMessage());
            }
        }

        $this->info('Payment verification completed');
    }
}

// Security Middleware for Payment Routes
// app/Http/Middleware/PaymentSecurityMiddleware.php
class PaymentSecurityMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Check if user is suspended
        if ($user->status === 'suspended' || $user->status === 'banned') {
            return response()->json(['error' => 'Account suspended'], 403);
        }

        // Check KYC requirement for large amounts
        if ($request->has('amount') && $request->amount > 1000) {
            if ($user->kyc_status !== 'approved') {
                return response()->json(['error' => 'KYC verification required for amounts above R$ 1,000'], 403);
            }
        }

        // Rate limiting for payment requests
        $key = 'payment_requests_' . $user->id;
        $requests = cache()->get($key, 0);
        
        if ($requests >= 10) { // Max 10 payment requests per hour
            return response()->json(['error' => 'Too many payment requests'], 429);
        }
        
        cache()->put($key, $requests + 1, 3600);

        return $next($request);
    }
}