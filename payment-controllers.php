<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\PlisioService;
use App\Services\PrimepagService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PaymentController extends Controller
{
    protected $plisioService;
    protected $primepagService;

    public function __construct(PlisioService $plisioService, PrimepagService $primepagService)
    {
        $this->plisioService = $plisioService;
        $this->primepagService = $primepagService;
        $this->middleware('auth')->except(['plisioWebhook', 'primepagWebhook']);
    }

    public function getPaymentMethods()
    {
        $methods = PaymentMethod::active()->get();
        
        return response()->json([
            'success' => true,
            'methods' => $methods->map(function($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'type' => $method->type,
                    'currency' => $method->currency,
                    'min_amount' => $method->min_amount,
                    'max_amount' => $method->max_amount,
                    'fee_percentage' => $method->fee_percentage,
                    'fee_fixed' => $method->fee_fixed,
                ];
            })
        ]);
    }

    public function createDeposit(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
        ]);

        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $user = auth()->user();
        $amount = $request->amount;

        // Validate amount limits
        if ($amount < $paymentMethod->min_amount || $amount > $paymentMethod->max_amount) {
            return response()->json([
                'success' => false,
                'message' => "Valor deve estar entre R$ {$paymentMethod->min_amount} e R$ {$paymentMethod->max_amount}"
            ], 400);
        }

        // Calculate fees
        $fee = $paymentMethod->calculateFee($amount);
        $totalAmount = $amount + $fee;

        DB::beginTransaction();
        try {
            // Create transaction record
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'deposit',
                'amount' => $amount,
                'currency' => $paymentMethod->currency,
                'status' => 'pending',
                'payment_method' => $paymentMethod->type,
                'metadata' => [
                    'payment_method_id' => $paymentMethod->id,
                    'fee' => $fee,
                    'total_amount' => $totalAmount,
                ]
            ]);

            // Process payment based on provider
            if ($paymentMethod->provider === 'plisio') {
                $result = $this->plisioService->createPayment($transaction, $paymentMethod);
            } elseif ($paymentMethod->provider === 'primepag') {
                $result = $this->primepagService->createPixPayment($transaction, $paymentMethod);
            } else {
                throw new \Exception('Provider não suportado');
            }

            if (!$result['success']) {
                throw new \Exception($result['message']);
            }

            // Update transaction with payment details
            $transaction->update([
                'payment_id' => $result['payment_id'],
                'metadata' => array_merge($transaction->metadata, $result['metadata'])
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'transaction_id' => $transaction->id,
                'payment_data' => $result['payment_data']
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Payment creation failed', [
                'user_id' => $user->id,
                'amount' => $amount,
                'method' => $paymentMethod->name,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar pagamento: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createWithdrawal(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'wallet_address' => 'required_if:payment_method.type,crypto|string',
            'pix_key' => 'required_if:payment_method.type,pix|string',
        ]);

        $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);
        $user = auth()->user();
        $amount = $request->amount;

        // Validate user balance
        if ($user->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'Saldo insuficiente'
            ], 400);
        }

        // Validate amount limits
        $minWithdrawal = setting('min_withdrawal', 10);
        $maxWithdrawal = setting('max_withdrawal', 10000);
        
        if ($amount < $minWithdrawal || $amount > $maxWithdrawal) {
            return response()->json([
                'success' => false,
                'message' => "Valor deve estar entre R$ {$minWithdrawal} e R$ {$maxWithdrawal}"
            ], 400);
        }

        // Check daily withdrawal limit
        $dailyWithdrawals = Transaction::where('user_id', $user->id)
            ->where('type', 'withdrawal')
            ->whereDate('created_at', Carbon::today())
            ->sum('amount');

        $dailyLimit = setting('daily_withdrawal_limit', 50000);
        if (($dailyWithdrawals + $amount) > $dailyLimit) {
            return response()->json([
                'success' => false,
                'message' => "Limite diário de saque excedido. Limite: R$ {$dailyLimit}"
            ], 400);
        }

        // Calculate fees
        $fee = $paymentMethod->calculateFee($amount);
        $netAmount = $amount - $fee;

        DB::beginTransaction();
        try {
            // Deduct from user balance
            $user->decrement('balance', $amount);

            // Create withdrawal transaction
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'withdrawal',
                'amount' => $amount,
                'currency' => $paymentMethod->currency,
                'status' => 'pending',
                'payment_method' => $paymentMethod->type,
                'wallet_address' => $request->wallet_address,
                'pix_key' => $request->pix_key,
                'metadata' => [
                    'payment_method_id' => $paymentMethod->id,
                    'fee' => $fee,
                    'net_amount' => $netAmount,
                ]
            ]);

            DB::commit();

            // Log withdrawal request
            Log::info('Withdrawal request created', [
                'user_id' => $user->id,
                'transaction_id' => $transaction->id,
                'amount' => $amount,
                'method' => $paymentMethod->name
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Solicitação de saque criada. Será processada em até 24 horas.',
                'transaction_id' => $transaction->id
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Withdrawal creation failed', [
                'user_id' => $user->id,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar solicitação de saque'
            ], 500);
        }
    }

    public function getTransactionHistory(Request $request)
    {
        $user = auth()->user();
        $query = Transaction::where('user_id', $user->id);

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $transactions = $query->latest()->paginate(20);

        return response()->json([
            'success' => true,
            'transactions' => $transactions
        ]);
    }

    public function getTransactionDetails($id)
    {
        $user = auth()->user();
        $transaction = Transaction::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'transaction' => $transaction
        ]);
    }

    // Webhook handlers
    public function plisioWebhook(Request $request)
    {
        try {
            $result = $this->plisioService->handleWebhook($request);
            
            if ($result['success']) {
                return response()->json(['status' => 'OK']);
            }
            
            return response()->json(['error' => $result['message']], 400);
            
        } catch (\Exception $e) {
            Log::error('Plisio webhook error', [
                'data' => $request->all(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    public function primepagWebhook(Request $request)
    {
        try {
            $result = $this->primepagService->handleWebhook($request);
            
            if ($result['success']) {
                return response()->json(['status' => 'OK']);
            }
            
            return response()->json(['error' => $result['message']], 400);
            
        } catch (\Exception $e) {
            Log::error('PRIMEPAG webhook error', [
                'data' => $request->all(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    // Admin methods for manual processing
    public function processWithdrawal(Request $request, $id)
    {
        $this->middleware('admin');
        
        $transaction = Transaction::findOrFail($id);
        
        if ($transaction->type !== 'withdrawal' || $transaction->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Transação inválida para processamento'
            ], 400);
        }

        $paymentMethod = PaymentMethod::find($transaction->metadata['payment_method_id']);
        
        try {
            if ($paymentMethod->provider === 'plisio') {
                $result = $this->plisioService->processWithdrawal($transaction, $paymentMethod);
            } elseif ($paymentMethod->provider === 'primepag') {
                $result = $this->primepagService->processPixWithdrawal($transaction, $paymentMethod);
            } else {
                throw new \Exception('Provider não suportado');
            }

            if ($result['success']) {
                $transaction->update([
                    'status' => 'processing',
                    'payment_id' => $result['payment_id'] ?? null,
                    'processed_at' => now(),
                    'processed_by' => auth()->id(),
                    'metadata' => array_merge($transaction->metadata, $result['metadata'] ?? [])
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Saque processado com sucesso'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message']
            ], 400);

        } catch (\Exception $e) {
            Log::error('Manual withdrawal processing failed', [
                'transaction_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar saque'
            ], 500);
        }
    }
}