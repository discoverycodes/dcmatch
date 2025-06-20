<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PlisioService
{
    protected $apiKey;
    protected $secretKey;
    protected $baseUrl = 'https://plisio.net/api/v1/';

    public function __construct()
    {
        $this->apiKey = config('services.plisio.api_key');
        $this->secretKey = config('services.plisio.secret_key');
    }

    public function createPayment(Transaction $transaction, PaymentMethod $paymentMethod)
    {
        try {
            $callbackUrl = route('webhook.plisio');
            $amount = $transaction->amount;
            
            $params = [
                'source_currency' => 'BRL',
                'source_amount' => $amount,
                'order_number' => $transaction->id,
                'currency' => 'USDT',
                'email' => $transaction->user->email,
                'order_name' => 'Depósito - Memory Game',
                'callback_url' => $callbackUrl,
                'api_key' => $this->apiKey,
            ];

            $response = Http::get($this->baseUrl . 'invoices/new', $params);

            if (!$response->successful()) {
                Log::error('Plisio API error', [
                    'response' => $response->body(),
                    'params' => $params
                ]);
                return [
                    'success' => false,
                    'message' => 'Erro na API Plisio: ' . $response->body()
                ];
            }

            $data = $response->json();

            if ($data['status'] !== 'success') {
                return [
                    'success' => false,
                    'message' => $data['data']['message'] ?? 'Erro desconhecido na Plisio'
                ];
            }

            $invoice = $data['data'];

            return [
                'success' => true,
                'payment_id' => $invoice['id'],
                'payment_data' => [
                    'wallet_address' => $invoice['wallet_hash'],
                    'amount_crypto' => $invoice['amount'],
                    'currency' => $invoice['currency'],
                    'qr_code' => $invoice['qr_code'],
                    'invoice_url' => $invoice['invoice_url'],
                    'expires_at' => $invoice['expire_utc'],
                ],
                'metadata' => [
                    'plisio_invoice_id' => $invoice['id'],
                    'plisio_txn_id' => $invoice['txn_id'],
                    'crypto_amount' => $invoice['amount'],
                    'crypto_currency' => $invoice['currency'],
                    'wallet_hash' => $invoice['wallet_hash'],
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Plisio payment creation failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro interno: ' . $e->getMessage()
            ];
        }
    }

    public function handleWebhook($request)
    {
        $data = $request->all();
        
        // Verify webhook signature
        if (!$this->verifyWebhookSignature($data, $request->header('X-Plisio-Signature'))) {
            Log::warning('Invalid Plisio webhook signature', $data);
            return ['success' => false, 'message' => 'Invalid signature'];
        }

        $transactionId = $data['order_number'];
        $status = $data['status'];
        $txnId = $data['txn_id'];

        $transaction = Transaction::find($transactionId);
        if (!$transaction) {
            Log::warning('Plisio webhook: transaction not found', ['id' => $transactionId]);
            return ['success' => false, 'message' => 'Transaction not found'];
        }

        DB::beginTransaction();
        try {
            switch ($status) {
                case 'completed':
                    if ($transaction->status === 'pending') {
                        $transaction->update([
                            'status' => 'completed',
                            'metadata' => array_merge($transaction->metadata, [
                                'plisio_txn_id' => $txnId,
                                'completed_at' => now(),
                                'actual_amount' => $data['source_amount'],
                                'crypto_amount' => $data['amount'],
                            ])
                        ]);

                        // Add balance to user
                        $transaction->user->increment('balance', $transaction->amount);

                        Log::info('Plisio payment completed', [
                            'transaction_id' => $transaction->id,
                            'user_id' => $transaction->user_id,
                            'amount' => $transaction->amount
                        ]);
                    }
                    break;

                case 'cancelled':
                case 'expired':
                    if ($transaction->status === 'pending') {
                        $transaction->update([
                            'status' => 'cancelled',
                            'metadata' => array_merge($transaction->metadata, [
                                'cancelled_reason' => $status,
                                'cancelled_at' => now(),
                            ])
                        ]);
                    }
                    break;

                case 'error':
                    $transaction->update([
                        'status' => 'failed',
                        'metadata' => array_merge($transaction->metadata, [
                            'error_reason' => $data['error'] ?? 'Unknown error',
                            'failed_at' => now(),
                        ])
                    ]);
                    break;
            }

            DB::commit();
            return ['success' => true];

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Plisio webhook processing failed', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            return ['success' => false, 'message' => 'Processing failed'];
        }
    }

    public function processWithdrawal(Transaction $transaction, PaymentMethod $paymentMethod)
    {
        try {
            $params = [
                'psys_cid' => 'USDT_BSC', // USDT BEP-20
                'amount' => $transaction->metadata['net_amount'],
                'to' => $transaction->wallet_address,
                'type' => 'mass_cash_out',
                'api_key' => $this->apiKey,
            ];

            $response = Http::post($this->baseUrl . 'operations/withdraw', $params);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'message' => 'Erro na API Plisio: ' . $response->body()
                ];
            }

            $data = $response->json();

            if ($data['status'] !== 'success') {
                return [
                    'success' => false,
                    'message' => $data['data']['message'] ?? 'Erro no processamento'
                ];
            }

            return [
                'success' => true,
                'payment_id' => $data['data']['id'],
                'metadata' => [
                    'plisio_operation_id' => $data['data']['id'],
                    'withdrawal_initiated_at' => now(),
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Plisio withdrawal failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro interno'
            ];
        }
    }

    private function verifyWebhookSignature($data, $signature)
    {
        if (!$signature || !$this->secretKey) {
            return false;
        }

        $expectedSignature = hash_hmac('sha1', json_encode($data), $this->secretKey);
        return hash_equals($expectedSignature, $signature);
    }

    public function getBalance()
    {
        try {
            $response = Http::get($this->baseUrl . 'balances', [
                'api_key' => $this->apiKey
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data'] ?? [];
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Failed to get Plisio balance', ['error' => $e->getMessage()]);
            return [];
        }
    }
}

class PrimepagService
{
    protected $clientId;
    protected $clientSecret;
    protected $baseUrl = 'https://api.primepag.com/v1/';

    public function __construct()
    {
        $this->clientId = config('services.primepag.client_id');
        $this->clientSecret = config('services.primepag.client_secret');
    }

    public function createPixPayment(Transaction $transaction, PaymentMethod $paymentMethod)
    {
        try {
            $accessToken = $this->getAccessToken();
            
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'Erro na autenticação PRIMEPAG'
                ];
            }

            $params = [
                'external_id' => $transaction->id,
                'amount' => (int)($transaction->amount * 100), // Amount in cents
                'description' => 'Depósito - Memory Game',
                'payer' => [
                    'name' => $transaction->user->name,
                    'email' => $transaction->user->email,
                    'document' => $transaction->user->document_number ?? '00000000000',
                ],
                'payment_method' => 'pix',
                'callback_url' => route('webhook.primepag'),
                'expiration_date' => now()->addMinutes(15)->toISOString(),
            ];

            $response = Http::withToken($accessToken)
                ->post($this->baseUrl . 'payments', $params);

            if (!$response->successful()) {
                Log::error('PRIMEPAG API error', [
                    'response' => $response->body(),
                    'params' => $params
                ]);
                return [
                    'success' => false,
                    'message' => 'Erro na API PRIMEPAG: ' . $response->body()
                ];
            }

            $data = $response->json();

            if (!isset($data['id'])) {
                return [
                    'success' => false,
                    'message' => 'Resposta inválida da PRIMEPAG'
                ];
            }

            return [
                'success' => true,
                'payment_id' => $data['id'],
                'payment_data' => [
                    'pix_code' => $data['pix_code'],
                    'qr_code' => $data['qr_code'],
                    'qr_code_image' => $data['qr_code_image'],
                    'expires_at' => $data['expiration_date'],
                ],
                'metadata' => [
                    'primepag_payment_id' => $data['id'],
                    'pix_code' => $data['pix_code'],
                ]
            ];

        } catch (\Exception $e) {
            Log::error('PRIMEPAG payment creation failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro interno: ' . $e->getMessage()
            ];
        }
    }

    public function handleWebhook($request)
    {
        $data = $request->all();
        
        // Verify webhook signature
        if (!$this->verifyWebhookSignature($data, $request->header('X-Primepag-Signature'))) {
            Log::warning('Invalid PRIMEPAG webhook signature', $data);
            return ['success' => false, 'message' => 'Invalid signature'];
        }

        $transactionId = $data['external_id'];
        $status = $data['status'];

        $transaction = Transaction::find($transactionId);
        if (!$transaction) {
            Log::warning('PRIMEPAG webhook: transaction not found', ['id' => $transactionId]);
            return ['success' => false, 'message' => 'Transaction not found'];
        }

        DB::beginTransaction();
        try {
            switch ($status) {
                case 'paid':
                    if ($transaction->status === 'pending') {
                        $transaction->update([
                            'status' => 'completed',
                            'metadata' => array_merge($transaction->metadata, [
                                'primepag_transaction_id' => $data['transaction_id'],
                                'completed_at' => now(),
                                'paid_amount' => $data['amount'] / 100, // Convert from cents
                                'pix_end_to_end_id' => $data['end_to_end_id'] ?? null,
                            ])
                        ]);

                        // Add balance to user
                        $transaction->user->increment('balance', $transaction->amount);

                        Log::info('PRIMEPAG payment completed', [
                            'transaction_id' => $transaction->id,
                            'user_id' => $transaction->user_id,
                            'amount' => $transaction->amount
                        ]);
                    }
                    break;

                case 'cancelled':
                case 'expired':
                    if ($transaction->status === 'pending') {
                        $transaction->update([
                            'status' => 'cancelled',
                            'metadata' => array_merge($transaction->metadata, [
                                'cancelled_reason' => $status,
                                'cancelled_at' => now(),
                            ])
                        ]);
                    }
                    break;

                case 'failed':
                    $transaction->update([
                        'status' => 'failed',
                        'metadata' => array_merge($transaction->metadata, [
                            'error_reason' => $data['failure_reason'] ?? 'Unknown error',
                            'failed_at' => now(),
                        ])
                    ]);
                    break;
            }

            DB::commit();
            return ['success' => true];

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('PRIMEPAG webhook processing failed', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            return ['success' => false, 'message' => 'Processing failed'];
        }
    }

    public function processPixWithdrawal(Transaction $transaction, PaymentMethod $paymentMethod)
    {
        try {
            $accessToken = $this->getAccessToken();
            
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'Erro na autenticação PRIMEPAG'
                ];
            }

            $params = [
                'external_id' => $transaction->id,
                'amount' => (int)($transaction->metadata['net_amount'] * 100), // Amount in cents
                'pix_key' => $transaction->pix_key,
                'description' => 'Saque - Memory Game',
                'recipient' => [
                    'name' => $transaction->user->name,
                    'document' => $transaction->user->document_number ?? '00000000000',
                ],
            ];

            $response = Http::withToken($accessToken)
                ->post($this->baseUrl . 'payouts', $params);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'message' => 'Erro na API PRIMEPAG: ' . $response->body()
                ];
            }

            $data = $response->json();

            return [
                'success' => true,
                'payment_id' => $data['id'],
                'metadata' => [
                    'primepag_payout_id' => $data['id'],
                    'withdrawal_initiated_at' => now(),
                ]
            ];

        } catch (\Exception $e) {
            Log::error('PRIMEPAG withdrawal failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro interno'
            ];
        }
    }

    private function getAccessToken()
    {
        try {
            $response = Http::post($this->baseUrl . 'auth/token', [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'grant_type' => 'client_credentials'
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['access_token'] ?? null;
            }

            Log::error('PRIMEPAG authentication failed', [
                'response' => $response->body()
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('PRIMEPAG authentication error', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    private function verifyWebhookSignature($data, $signature)
    {
        if (!$signature || !$this->clientSecret) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', json_encode($data), $this->clientSecret);
        return hash_equals($expectedSignature, $signature);
    }

    public function getBalance()
    {
        try {
            $accessToken = $this->getAccessToken();
            
            if (!$accessToken) {
                return [];
            }

            $response = Http::withToken($accessToken)
                ->get($this->baseUrl . 'account/balance');

            if ($response->successful()) {
                $data = $response->json();
                return $data ?? [];
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Failed to get PRIMEPAG balance', ['error' => $e->getMessage()]);
            return [];
        }
    }
}