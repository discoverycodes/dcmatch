import { storage } from './database-storage';
import { LogSanitizer, safeLog } from './log-sanitizer';

interface PrimepagToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  created_at: number;
}

interface PrimepagPixRequest {
  amount: number;
  description: string;
  external_id: string;
  payer?: {
    name?: string;
    document?: string;
    email?: string;
  };
}

interface PrimepagPixResponse {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  pix_code: string;
  qr_code: string;
  external_id: string;
  reference_code: string;
  expires_at: string;
  created_at: string;
}

interface PrimepagPixWithdrawalRequest {
  amount: number;
  description: string;
  external_id: string;
  pix_key: string;
  recipient: {
    name: string;
    document: string;
  };
}

interface PrimepagPixWithdrawalResponse {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  pix_key: string;
  external_id: string;
  created_at: string;
  recipient: {
    name: string;
    document: string;
  };
}

class PrimepagService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private isTestMode: boolean;

  constructor() {
    // Initialize with default values, will be updated when needed
    this.isTestMode = true;
    this.baseUrl = 'https://api-stg.primepag.com.br';
    this.clientId = '';
    this.clientSecret = '';
  }

  private async loadConfig(): Promise<void> {
    try {
      const config = await storage.getPaymentSettings('primepag');
      
      // Force test mode since credentials are only valid for staging
      this.isTestMode = true;
      
      // Always use staging URL for current credentials
      this.baseUrl = 'https://api-stg.primepag.com.br';
      
      // Priorizar credenciais do ambiente, depois do banco de dados
      this.clientId = process.env.PRIMEPAG_CLIENT_ID || config.clientId || '';
      this.clientSecret = process.env.PRIMEPAG_CLIENT_SECRET || config.clientSecret || '';
      
      console.log(`[PRIMEPAG] Environment: ${this.isTestMode ? 'STAGING (TEST)' : 'PRODUCTION'}`);
      console.log(`[PRIMEPAG] API Base URL: ${this.baseUrl}`);
      console.log(`[PRIMEPAG] Credentials source: ${process.env.PRIMEPAG_CLIENT_ID ? 'Environment variables' : 'Database config'}`);
      
      // Validar se as credenciais estão presentes
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Missing Primepag credentials - check admin configuration');
      }
      
    } catch (error) {
      console.error('[PRIMEPAG] Configuration error:', error);
      // Fallback seguro para ambiente de testes
      this.isTestMode = true;
      this.baseUrl = 'https://api-stg.primepag.com.br';
      this.clientId = process.env.PRIMEPAG_CLIENT_ID || '';
      this.clientSecret = process.env.PRIMEPAG_CLIENT_SECRET || '';
      
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Critical: Primepag credentials not configured');
      }
    }
  }

  async getToken(): Promise<string> {
    try {
      // Load latest configuration from database
      await this.loadConfig();
      
      // Verificar se existe token válido no storage
      const storedToken = await storage.getPrimepagToken();
      
      if (storedToken && this.isTokenValid(storedToken)) {
        LogSanitizer.logAuth("Token retrieved from cache", "system");
        return storedToken.access_token;
      }

      LogSanitizer.logAuth("Generating new token", "system");
      
      // Primepag usa HTTP Basic Auth para autenticação
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/auth/generate_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({
          'grant_type': 'client_credentials'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PRIMEPAG] Authentication failed:', response.status, errorText);
        throw new Error(`Primepag authentication error: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json();
      LogSanitizer.logAuth("Token generated successfully", "system");

      const token: PrimepagToken = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in || 3600, // 1 hora padrão
        created_at: Date.now()
      };

      await storage.savePrimepagToken(token);
      return token.access_token;
    } catch (error) {
      console.error('[PRIMEPAG] Authentication failed:', error);
      throw new Error('Unable to authenticate with Primepag API. Please check credentials.');
    }
  }

  private isTokenValid(token: PrimepagToken): boolean {
    const now = Date.now();
    const tokenAge = now - token.created_at;
    const expiresIn = (token.expires_in - 60) * 1000; // 1 minuto de margem
    
    return tokenAge < expiresIn;
  }

  async createPixPayment(request: PrimepagPixRequest): Promise<PrimepagPixResponse> {
    try {
      const token = await this.getToken();
      
      console.log('[PRIMEPAG] Creating PIX payment:', request);

      // Endpoint correto da Primepag para criar QR Code PIX
      const response = await fetch(`${this.baseUrl}/v1/pix/qrcodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          value_cents: Math.round(request.amount * 100), // Valor em centavos
          description: request.description,
          external_id: request.external_id,
          expires_in: 900, // 15 minutos em segundos
          payer: {
            name: request.payer?.name || "Cliente",
            document: request.payer?.document || "",
            email: request.payer?.email || ""
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PRIMEPAG] API request failed:', response.status, errorText);
        console.error('[PRIMEPAG] Request body was:', JSON.stringify({
          value_cents: Math.round(request.amount * 100),
          description: request.description,
          external_id: request.external_id,
          expires_in: 900,
          payer: {
            name: request.payer?.name || "Cliente",
            document: request.payer?.document || "",
            email: request.payer?.email || ""
          }
        }));
        throw new Error(`Primepag API Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('[PRIMEPAG] Full API response:', JSON.stringify(responseData, null, 2));
      
      const pixData = responseData.qrcode;
      if (!pixData) {
        console.error('[PRIMEPAG] No qrcode in response:', responseData);
        throw new Error('Invalid response format from Primepag API - missing qrcode data');
      }
      
      console.log('[PRIMEPAG] PIX QR Code created successfully:', pixData.reference_code);

      return {
        id: pixData.reference_code,
        amount: request.amount, // Já está em reais
        description: request.description,
        status: 'pending',
        pix_code: pixData.content,
        qr_code: pixData.image_base64 || `data:image/svg+xml;base64,${Buffer.from(`<svg>QR Code: ${pixData.reference_code}</svg>`).toString('base64')}`,
        external_id: request.external_id,
        reference_code: pixData.reference_code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[PRIMEPAG] Failed to create PIX payment:', error);
      throw new Error('Failed to create PIX payment with Primepag API. Please check credentials and connection.');
    }
  }



  async createPixWithdrawal(request: PrimepagPixWithdrawalRequest): Promise<PrimepagPixWithdrawalResponse> {
    try {
      await this.loadConfig();
      console.log('[PRIMEPAG] Creating PIX withdrawal:', request);

      const token = await this.getToken();
      
      const response = await fetch(`${this.baseUrl}/v1/pix/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          value_cents: Math.round(request.amount * 100), // Valor em centavos
          initiation_type: 'dict', // Tipo de iniciação, pode ser 'dict' ou 'manual'          
          receiver_name: "John Doe", // Nome do destinatário
          idempotent_id: request.external_id, // ID único para evitar duplicação
          pix_key_type: 'cpf', // Tipo de chave PIX, pode ser 'cpf', 'cnpj', 'email', etc.
          pix_key: request.pix_key,
          authorized: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PRIMEPAG] PIX withdrawal API error:', response.status, errorText);
        

        
        throw new Error(`Primepag withdrawal error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[PRIMEPAG] PIX withdrawal created successfully:', data.id);

      return {
        id: data.id,
        amount: data.amount / 100,
        description: data.description,
        status: data.status,
        pix_key: data.pix_key,
        external_id: data.external_id,
        created_at: data.created_at,
        recipient: data.recipient
      };

    } catch (error) {
      console.error('[PRIMEPAG] Error creating PIX withdrawal:', error);
      throw error;
    }
  }

  async checkPixPayment(paymentId: string): Promise<PrimepagPixResponse> {
    try {
      await this.loadConfig();
      const token = await this.getToken();
      
      console.log('[PRIMEPAG] Checking PIX payment:', paymentId);
      
      const response = await fetch(`${this.baseUrl}/v1/pix/qrcodes/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PRIMEPAG] Check payment API error:', response.status, errorText);
        throw new Error(`Primepag check payment error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[PRIMEPAG] PIX payment status checked successfully:', data.id);

      return {
        id: data.id,
        amount: data.amount / 100, // Convert from cents
        description: data.description,
        status: data.status,
        pix_code: data.pix_code,
        qr_code: data.qr_code_base64 || data.qr_code,
        external_id: data.external_id,
        reference_code: data.reference_code,
        expires_at: data.expires_at,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('[PRIMEPAG] Error checking PIX payment:', error);
      throw error;
    }
  }

  async handleWebhook(payload: any, authHeader: string | undefined): Promise<{ success: boolean; message: string }> {
    try {
      // Validar senha no header Authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[PRIMEPAG] Webhook rejected: Missing or invalid Authorization header');
        return { success: false, message: 'Unauthorized - Missing Authorization header' };
      }

      const webhookPassword = authHeader.replace('Bearer ', '');
      const expectedPassword = process.env.PRIMEPAG_WEBHOOK_PASSWORD || 'primepag_webhook_2024';
      
      if (webhookPassword !== expectedPassword) {
        console.warn('[PRIMEPAG] Webhook rejected: Invalid password');
        return { success: false, message: 'Unauthorized - Invalid password' };
      }

      console.log('[PRIMEPAG] Webhook authenticated successfully:', payload);
      
      // Validar se o reference_code existe (salvo como external_txn_id)
      if (!payload.reference_code) {
        console.error('[PRIMEPAG] Webhook missing reference_code');
        return { success: false, message: 'Missing reference_code' };
      }

      // Buscar transação pelo external_txn_id (reference_code da Primepag)
      const transaction = await storage.getTransactionByExternalId(payload.reference_code);
      if (!transaction) {
        console.error('[PRIMEPAG] Transaction not found for reference_code:', payload.reference_code);
        return { success: false, message: 'Transaction not found' };
      }

      // Validar valor (PRIMEPAG envia em centavos)
      const payloadAmountInReais = payload.amount / 100;
      if (Math.abs(payloadAmountInReais - transaction.amount) > 0.01) {
        console.error('[PRIMEPAG] Amount mismatch:', {
          expected: transaction.amount,
          received: payloadAmountInReais
        });
        return { success: false, message: 'Amount mismatch' };
      }

      // Atualizar status da transação
      await storage.updateTransaction(transaction.id, {
        status: payload.status === 'paid' ? 'completed' : payload.status,
        metadata: {
          ...transaction.metadata,
          webhook_data: payload,
          processed_at: new Date().toISOString()
        }
      });

      // Se pagamento foi aprovado, atualizar saldo do usuário
      if (payload.status === 'paid') {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const currentBalance = parseFloat(user.balance || '0');
          const depositAmount = parseFloat(transaction.amount);
          const newBalance = currentBalance + depositAmount;
          
          await storage.updateUserBalance(transaction.userId, newBalance);
          console.log('[PRIMEPAG] User balance updated:', {
            userId: transaction.userId,
            oldBalance: currentBalance,
            newBalance: newBalance,
            addedAmount: depositAmount
          });
        }
      }

      console.log('[PRIMEPAG] Webhook processed successfully for reference_code:', payload.reference_code);
      return { success: true, message: 'Webhook processed successfully' };
      
    } catch (error) {
      console.error('[PRIMEPAG] Error processing webhook:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}

export const primepagService = new PrimepagService();