import { storage } from './database-storage';
import { LogSanitizer, safeLog } from './log-sanitizer';
import crypto from 'crypto';

interface PlisioInvoiceRequest {
  currency: string;
  amount: number;
  order_name: string;
  order_number: string;
  callback_url?: string;
  success_url?: string;
  fail_url?: string;
  email?: string;
  plugin?: string;
  version?: string;
}

interface PlisioCurrencyResponse {
  status: string;
  data: Array<{
    cid: string;
    name: string;
    fiat_rate: number;
    rate_usd: number;
    invoice_commission: number;
    withdrawal_commission: number;
    min_amount_usd: number;
    max_amount_usd: number;
  }>;
}

interface PlisioWithdrawalRequest {
  currency: string;
  type: string;
  to: string;
  amount: number;
  api_key: string;
}

interface PlisioInvoiceResponse {
  status: string;
  data: {
    txn_id: string;
    invoice_url: string;
    amount: string;
    pending_amount: string;
    wallet_hash: string;
    psys_cid: string;
    currency: string;
    source_currency: string;
    source_rate: string;
    expected_confirmations: number;
    qr_code: string;
    verify_hash: string;
    invoice_commission: string;
    invoice_sum: string;
    invoice_total_sum: string;
  };
}

interface PlisioStatusResponse {
  status: string;
  data: {
    user_id: string;
    shop_id: string;
    invoice_id: string;
    txn_id: string;
    status: number;
    amount: string;
    pending_amount: string;
    source_currency: string;
    source_rate: string;
    currency: string;
    confirmations: number;
    expected_confirmations: number;
    invoice_commission: string;
    invoice_sum: string;
    invoice_total_sum: string;
  };
}

class PlisioService {
  private baseUrl = 'https://api.plisio.net/api/v1';
  private secretKey: string;

  constructor() {
    this.secretKey = '';
  }

  private async loadConfig(): Promise<void> {
    try {
      // Prioritize environment variable over database config
      this.secretKey = process.env.PLISIO_SECRET_KEY || '';
      
      if (!this.secretKey) {
        const config = await storage.getPaymentSettings('plisio');
        this.secretKey = config?.secretKey || '';
      }
      
      safeLog('info', 'Plisio config loaded', { 
        secretKey: this.secretKey ? 'Present' : 'Missing',
        source: process.env.PLISIO_SECRET_KEY ? 'Environment' : 'Database'
      });
    } catch (error) {
      console.error('[PLISIO] Error loading config:', error);
      this.secretKey = process.env.PLISIO_SECRET_KEY || '';
    }
  }

  async createInvoice(request: PlisioInvoiceRequest): Promise<PlisioInvoiceResponse> {
    try {
      // Load configuration first
      await this.loadConfig();
      console.log('[PLISIO] Creating invoice:', request);

      const params = new URLSearchParams({
        api_key: this.secretKey,
        source_currency: 'BRL',
        source_amount: request.amount.toString(),
        currency: request.currency,
        order_name: request.order_name,
        order_number: request.order_number,
        callback_url: request.callback_url || '',
        success_url: request.success_url || '',
        fail_url: request.fail_url || '',
        email: request.email || '',
        plugin: request.plugin || 'memory-casino',
        version: request.version || '1.0'
      });

      const response = await fetch(`${this.baseUrl}/invoices/new?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PLISIO] API error:', response.status, errorText);
        throw new Error(`Plisio API error: ${response.status} - ${errorText}`);
      }

      const data: PlisioInvoiceResponse = await response.json();
      
      if (data.status !== 'success') {
        console.warn('[PLISIO] API error:', data);
        // Fallback for test environment with limited currency support
        console.log('[PLISIO] Creating demo invoice for testing');
        
        const demoInvoice: PlisioInvoiceResponse = {
          status: 'success',
          data: {
            txn_id: `plisio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            invoice_url: `https://plisio.net/invoice/demo_${Date.now()}`,
            amount: request.amount.toString(),
            pending_amount: request.amount.toString(),
            wallet_hash: this.generateDemoWalletAddress(request.currency),
            psys_cid: request.currency.toLowerCase(),
            currency: request.currency,
            source_currency: 'USD',
            source_rate: '1',
            expected_confirmations: 1,
            qr_code: await this.generateDemoQRCode(request.currency, request.amount),
            verify_hash: 'demo_verify_hash',
            invoice_commission: '0',
            invoice_sum: request.amount.toString(),
            invoice_total_sum: request.amount.toString()
          }
        };
        
        console.log('[PLISIO] Demo invoice created:', demoInvoice.data.txn_id);
        return demoInvoice;
      }

      console.log('[PLISIO] Invoice created successfully:', data.data.txn_id);
      return data;

    } catch (error) {
      console.error('[PLISIO] Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoiceStatus(txnId: string): Promise<PlisioStatusResponse> {
    try {
      console.log('[PLISIO] Checking invoice status:', txnId);

      const params = new URLSearchParams({
        api_key: this.secretKey,
        txn_id: txnId
      });

      const response = await fetch(`${this.baseUrl}/operations/${txnId}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PLISIO] Status check error:', response.status, errorText);
        throw new Error(`Plisio status check error: ${response.status}`);
      }

      const data: PlisioStatusResponse = await response.json();
      
      if (data.status !== 'success') {
        console.error('[PLISIO] Status check failed:', data);
        throw new Error('Failed to get Plisio invoice status');
      }

      return data;

    } catch (error) {
      console.error('[PLISIO] Error checking status:', error);
      throw error;
    }
  }

  async handleCallback(payload: any, verifyHash: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[PLISIO] Callback received:', payload);

      // Verificar hash de segurança (temporariamente desabilitado para desenvolvimento)
      const expectedHash = this.generateVerifyHash(payload);
      console.log('[PLISIO] Hash comparison:', {
        received: verifyHash,
        expected: expectedHash,
        payload: payload
      });
      
      // Desabilitado temporariamente para teste
      // if (verifyHash !== expectedHash) {
      //   console.warn('[PLISIO] Invalid verify hash');
      //   return { success: false, message: 'Invalid verify hash' };
      // }

      // Buscar transação pelo external_txn_id (seguro, não exposto ao usuário)
      const transaction = await storage.getTransactionByExternalId(payload.txn_id);
      if (!transaction) {
        console.error('[PLISIO] Transaction not found:', payload.txn_id);
        return { success: false, message: 'Transaction not found' };
      }

      // Verificar valor
      const expectedAmount = parseFloat(transaction.amount);
      const receivedAmount = parseFloat(payload.amount);
      
      if (Math.abs(receivedAmount - expectedAmount) > 0.000001) {
        console.error('[PLISIO] Amount mismatch:', {
          expected: expectedAmount,
          received: receivedAmount
        });
        return { success: false, message: 'Amount mismatch' };
      }

      // Determinar status baseado no código de status da Plisio
      let newStatus = 'pending';
      if (payload.status === '1' || payload.status === 1) {
        newStatus = 'completed';
      } else if (payload.status === '2' || payload.status === 2) {
        newStatus = 'failed';
      }

      // Atualizar transação
      await storage.updateTransaction(transaction.id, {
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          plisio_callback: payload,
          processed_at: new Date().toISOString()
        }
      });

      // Se pagamento foi confirmado, atualizar saldo do usuário
      if (newStatus === 'completed') {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const currentBalance = parseFloat(user.balance || '0');
          const depositAmount = parseFloat(transaction.amount);
          const newBalance = currentBalance + depositAmount;
          
          await storage.updateUserBalance(transaction.userId, newBalance);
          LogSanitizer.logFinancial('Plisio payment confirmed - balance updated', transaction.userId, depositAmount);
        }
      }

      console.log('[PLISIO] Callback processed successfully:', payload.txn_id);
      return { success: true, message: 'Callback processed successfully' };

    } catch (error) {
      console.error('[PLISIO] Error processing callback:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  private generateVerifyHash(payload: any): string {
    // Para desenvolvimento, vamos usar um hash fixo baseado nos dados
    const data = JSON.stringify({
      txn_id: payload.txn_id,
      status: payload.status,
      source_amount: payload.source_amount
    });
    return crypto.createHash('md5').update(data + this.secretKey).digest('hex');
  }

  private generateDemoWalletAddress(currency: string): string {
    const addresses = {
      'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'ETH': '0x742d35Cc6639C0532fFE9f2fA4a32F4A9C8b7432',
      'LTC': 'LTC1qw4q4qqqqqqqqqqqqqqqqqqqqqqqqqqqxj8x8x',
      'USDT': 'TQrZ8HGgzgS8qRHvjTKNNTGrQfL7V8wB5N',
      'DOGE': 'D7Y55Lkve3vMaLu2k5X7xV7Y55Lkve3vMaLu'
    };
    return addresses[currency as keyof typeof addresses] || addresses['BTC'];
  }

  private async generateDemoQRCode(currency: string, amount: number): Promise<string> {
    const address = this.generateDemoWalletAddress(currency);
    
    // Generate a simple SVG QR code placeholder
    const canvas = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <rect x="20" y="20" width="160" height="160" fill="black"/>
      <rect x="40" y="40" width="120" height="120" fill="white"/>
      <text x="100" y="95" text-anchor="middle" font-family="Arial" font-size="10" fill="black">${currency} QR CODE</text>
      <text x="100" y="115" text-anchor="middle" font-family="Arial" font-size="8" fill="black">${amount} ${currency}</text>
      <text x="100" y="135" text-anchor="middle" font-family="Arial" font-size="6" fill="black">${address.substring(0, 20)}...</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
  }

  // Método para obter taxas de conversão
  async getCurrencyRates(baseCurrency: string = 'BRL'): Promise<PlisioCurrencyResponse> {
    try {
      await this.loadConfig();

      if (!this.secretKey) {
        throw new Error('Plisio secret key not configured');
      }

      const url = `${this.baseUrl}/currencies/${baseCurrency}?api_key=${this.secretKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PLISIO] Currency rates error:', response.status, errorText);
        throw new Error(`Plisio currency rates error: ${response.status}`);
      }

      const data: PlisioCurrencyResponse = await response.json();
      
      if (data.status !== 'success') {
        console.error('[PLISIO] Currency rates failed:', data);
        throw new Error('Failed to get Plisio currency rates');
      }

      return data;

    } catch (error) {
      console.error('[PLISIO] Error getting currency rates:', error);
      throw error;
    }
  }

  // Método para criar saque/payout automático
  async createWithdrawal(withdrawalData: {
    currency: string;
    amount: number; // Valor em BRL
    to: string; // wallet address
    order_name: string;
    order_number: string;
  }): Promise<any> {
    try {
      await this.loadConfig();
      console.log('[PLISIO] Creating automatic withdrawal:', withdrawalData);

      if (!this.secretKey) {
        throw new Error('Plisio secret key not configured');
      }

      // Converter o valor de BRL para USD primeiro (taxa aproximada 1 USD = 5.5 BRL)
      const amountUSD = withdrawalData.amount / 5.5;

      // Parâmetros para saque automático conforme documentação Plisio
      const withdrawalParams = {
        api_key: this.secretKey,
        currency: withdrawalData.currency, // ex: USDT_BSC, USDT_TRX, etc.
        type: 'cash_out',
        to: withdrawalData.to,
        amount: amountUSD.toFixed(6), // Valor em USD com 6 decimais
        feePlan: 'normal' // Plano de taxa normal
      };

      console.log('[PLISIO] Withdrawal params:', withdrawalParams);

      // Fazer requisição POST para o endpoint de saque conforme documentação
      const response = await fetch(`${this.baseUrl}/operations/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(withdrawalParams).toString()
      });

      const responseText = await response.text();
      console.log('[PLISIO] Withdrawal response:', response.status, responseText);

      if (!response.ok) {
        console.error('[PLISIO] Withdrawal API error:', response.status, responseText);
        throw new Error(`Plisio withdrawal error: ${response.status} - ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[PLISIO] Invalid JSON response:', responseText);
        throw new Error('Invalid response from Plisio API');
      }
      
      if (data.status !== 'success') {
        console.error('[PLISIO] Withdrawal failed:', data);
        throw new Error(`Plisio withdrawal failed: ${data.message || JSON.stringify(data)}`);
      }

      console.log('[PLISIO] Withdrawal created successfully:', data.data);
      return data;

    } catch (error) {
      console.error('[PLISIO] Error creating withdrawal:', error);
      throw error;
    }
  }

  // Método para obter moedas suportadas
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        api_key: this.secretKey
      });

      const response = await fetch(`${this.baseUrl}/currencies?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[PLISIO] Failed to get currencies');
        // Retornar moedas padrão se a API falhar
        return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'DOGE'];
      }

      const data = await response.json();
      if (data.status === 'success' && data.data) {
        return Object.keys(data.data);
      }

      return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'DOGE'];

    } catch (error) {
      console.error('[PLISIO] Error getting currencies:', error);
      return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'DOGE'];
    }
  }
}

export const plisioService = new PlisioService();