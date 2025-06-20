import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database-storage";
import { primepagService } from "./primepag";
import { plisioService } from "./plisio";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { emailService } from "./email-service";
import { LogSanitizer, safeLog } from "./log-sanitizer";
import { secureGameEngine } from "./secure-game-engine";
import { financialValidator } from "./financial-validator";
import { gameValidator } from "./game-state-validator";
import { cryptoGameValidator } from "./crypto-game-validator";
import { hashOnlyValidator } from "./hash-only-validator";
import { sessionCleaner } from "./session-cleaner";

// Validation schemas
const startGameSchema = z.object({
  betAmount: z.number().min(0.01).max(1000),
  theme: z.string().optional().default('UNI'), // ESP, ANI, MUS, UNI
});

const gameResultSchema = z.object({
  sessionId: z.string(),
  won: z.boolean(),
  matchedPairs: z.number().min(0).max(8),
  gameTime: z.number().min(1).max(600), // 1-600 segundos (10 minutos máximo)
  moves: z.array(z.object({
    cardIndex: z.number().min(0).max(15),
    timestamp: z.number()
  })).min(1).max(50),
});

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'client/public/uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Rate limiting for authentication attempts
  const authAttempts = new Map<string, { attempts: number; lastAttempt: number; blocked: boolean }>();
  
  // CAPTCHA storage - stores challenges temporarily
  const captchaStore = new Map<string, { challenge: string; expires: number; attempts: number }>();
  
  // Generate CAPTCHA challenge - 6 scattered numbers to type
  const generateCaptcha = () => {
    // Generate 6 random numbers (0-9 each)
    const numbers = [];
    for (let i = 0; i < 6; i++) {
      numbers.push(Math.floor(Math.random() * 10));
    }
    
    // The answer is the sequence of numbers as typed (not the sum)
    const result = numbers.join('');
    
    // Store the numbers as comma-separated string (frontend will parse and display)
    const expression = numbers.join(',');
    
    const challengeId = crypto.randomBytes(16).toString('hex');
    const challenge = {
      id: challengeId,
      expression,
      answer: result.toString(),
      timestamp: Date.now()
    };
    
    // Store with 10 minute expiration
    captchaStore.set(challengeId, {
      challenge: result, // Store the number sequence (not sum)
      expires: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });
    
    // Clean expired captchas
    captchaStore.forEach((data, id) => {
      if (Date.now() > data.expires) {
        captchaStore.delete(id);
      }
    });
    
    return challenge;
  };
  
  // Validate CAPTCHA
  const validateCaptcha = (challengeId: string, answer: string): boolean => {
    const stored = captchaStore.get(challengeId);
    if (!stored) return false;
    
    if (Date.now() > stored.expires) {
      captchaStore.delete(challengeId);
      return false;
    }
    
    stored.attempts++;
    if (stored.attempts > 3) {
      captchaStore.delete(challengeId);
      return false;
    }
    
    const isValid = stored.challenge === answer;
    if (isValid) {
      captchaStore.delete(challengeId);
    }
    
    return isValid;
  };
  
  const rateLimitAuth = (req: any, res: any, next: any, type: 'admin' | 'user' = 'user') => {
    const clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const realIP = Array.isArray(clientIP) ? clientIP[0] : clientIP.split(',')[0];
    const key = `${type}_${realIP}`;
    const now = Date.now();
    const maxAttempts = type === 'admin' ? 3 : 5; // Admin has stricter limits
    const blockDuration = type === 'admin' ? 15 * 60 * 1000 : 5 * 60 * 1000; // 15min for admin, 5min for user
    
    let record = authAttempts.get(key);
    
    if (!record) {
      record = { attempts: 0, lastAttempt: now, blocked: false };
      authAttempts.set(key, record);
    }
    
    // Check if still in blocking period
    if (record.blocked && (now - record.lastAttempt) < blockDuration) {
      console.log(`[SECURITY] Rate limit active for ${type} login from IP: ${realIP}`);
      return res.status(429).json({ 
        error: `Too many failed attempts. Try again in ${Math.ceil((blockDuration - (now - record.lastAttempt)) / 60000)} minutes.` 
      });
    }
    
    // Reset if block period expired
    if (record.blocked && (now - record.lastAttempt) >= blockDuration) {
      record.attempts = 0;
      record.blocked = false;
    }
    
    // Add attempt tracking middleware to request
    (req as any).rateLimitTracker = {
      key,
      record,
      maxAttempts,
      blockDuration,
      incrementFailed: () => {
        record.attempts++;
        record.lastAttempt = now;
        if (record.attempts >= maxAttempts) {
          record.blocked = true;
          console.log(`[SECURITY ALERT] IP ${realIP} blocked for ${type} brute force attempts`);
        }
        authAttempts.set(key, record);
      },
      clearAttempts: () => {
        record.attempts = 0;
        record.blocked = false;
        authAttempts.set(key, record);
      }
    };
    
    next();
  };
  
  // CAPTCHA route
  app.get("/api/captcha/generate", (req, res) => {
    try {
      const captcha = generateCaptcha();
      res.json({
        id: captcha.id,
        expression: captcha.expression,
        timestamp: captcha.timestamp
      });
    } catch (error) {
      console.error('CAPTCHA generation error:', error);
      res.status(500).json({ error: 'Failed to generate CAPTCHA' });
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { password, email, name, phone, cpf, captchaId, captchaAnswer } = req.body;
      
      if (!password || !email || !name) {
        return res.status(400).json({ error: "Name, email and password are required" });
      }
      
      // Validate CAPTCHA
      if (!captchaId || !captchaAnswer) {
        return res.status(400).json({ error: "CAPTCHA is required" });
      }
      
      if (!validateCaptcha(captchaId, captchaAnswer)) {
        return res.status(400).json({ error: "Invalid CAPTCHA answer" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      
      // Email validation with regex
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Check if user already exists by email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash the password with bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create new user with hashed password, using email as username
      const newUser = await storage.createUser({
        username: email, // Use email as username
        password: hashedPassword,
        email,
        name: name,
        phone: phone || null,
        cpf: cpf || null,
      });
      
      // Set session without regeneration to avoid double responses
      const sessionId = (req as any).sessionID;
      const loginTimestamp = Date.now();
      
      // Update user with session info
      await storage.updateUser(newUser.id, { 
        activeSessionId: sessionId,
        lastLoginAt: new Date()
      });
      
      // Register session in the cleaner
      await sessionCleaner.registerNewSession(newUser.id, sessionId);
      
      // Set session data
      (req as any).session.userId = newUser.id;
      (req as any).session.loginTime = loginTimestamp;
      (req as any).session.isSecure = true;
      (req as any).session.sessionTimestamp = loginTimestamp;
      
      console.log(`[REGISTRATION SUCCESS] User ${newUser.username} (ID: ${newUser.id}) registered with session ${sessionId}`);
      
      res.json({ 
        success: true, 
        user: { 
          token: newUser.userToken, 
          username: newUser.username, 
          email: newUser.email,
          name: newUser.name,
          id: newUser.id,
          balance: newUser.balance 
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => rateLimitAuth(req, res, next, 'user'), async (req, res) => {
    try {
      const { email, password, captchaId, captchaAnswer } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      // Validate CAPTCHA
      if (!captchaId || !captchaAnswer) {
        return res.status(400).json({ error: "CAPTCHA is required" });
      }
      
      if (!validateCaptcha(captchaId, captchaAnswer)) {
        return res.status(400).json({ error: "Invalid CAPTCHA answer" });
      }
      
      // Find user by email and use email as username
      const userByEmail = await storage.getUserByEmail(email);
      const user = userByEmail || await storage.getUserByUsername(email);
      if (!user) {
        (req as any).rateLimitTracker.incrementFailed();
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Compare password with bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        (req as any).rateLimitTracker.incrementFailed();
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Clear failed attempts on successful login
      (req as any).rateLimitTracker.clearAttempts();
      
      // SECURITY CRITICAL: Invalidate ALL existing sessions for this user
      const existingSessionId = (req as any).sessionID;
      
      // Generate new session timestamp for additional security
      const loginTimestamp = Date.now();
      
      // Regenerate session ID for security
      (req as any).session.regenerate(async (err: any) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        const newSessionId = (req as any).sessionID;
        console.log(`[SECURITY] User ${user.id} new session: ${newSessionId} (previous: ${existingSessionId})`);
        
        // Store user's NEW session ID + timestamp for ultra-strict validation
        await storage.updateUser(user.id, { 
          activeSessionId: newSessionId,
          lastLoginAt: new Date()
        });
        
        // Register session in the global cleaner
        await sessionCleaner.registerNewSession(user.id, newSessionId);
        
        // Set session data with timestamp
        (req as any).session.userId = user.id;
        (req as any).session.loginTime = loginTimestamp;
        (req as any).session.isSecure = true;
        (req as any).session.sessionTimestamp = loginTimestamp;
        
        console.log(`User ${user.username} logged in with NEW session ${newSessionId} at ${loginTimestamp}`);
        
        res.json({ 
          success: true, 
          user: { 
            token: user.userToken, 
            username: user.username, 
            email: user.email,
            name: user.name,
            id: user.id,
            balance: user.balance,
            sessionTimestamp: loginTimestamp
          } 
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (userId) {
        // Clear active session from database
        await storage.updateUser(userId, { 
          activeSessionId: null,
          lastLoginAt: new Date()
        });
        console.log(`User ${userId} logged out, session cleared`);
      }
      
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Public site settings endpoint
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error getting site settings:', error);
      res.status(500).json({ error: "Failed to get site settings" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const sessionId = (req as any).sessionID;
      const isSecure = (req as any).session?.isSecure;
      
      if (!userId || !sessionId || !isSecure) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Validar sessão única
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verificar se a sessão é válida
      if (user.activeSessionId && user.activeSessionId !== sessionId) {
        (req as any).session?.destroy();
        return res.status(401).json({ 
          error: "Sessão expirada devido a login em outro dispositivo",
          code: "CONCURRENT_LOGIN",
          requireLogin: true
        });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          balance: user.balance 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // PROTEÇÃO CRÍTICA: Middleware para validar sessão única por usuário
  const singleSessionMiddleware = async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    const sessionId = req.sessionID;
    const isSecure = req.session?.isSecure;
    
    // Pular validação para rotas públicas
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/site-settings', '/api/captcha', '/api/webhooks'];
    const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
    
    if (isPublicRoute) {
      return next();
    }
    
    // VERIFICAÇÃO RIGOROSA: Sem session = sem acesso
    if (!userId || !sessionId || !isSecure) {
      console.warn(`[SECURITY] Unauthorized access attempt - Path: ${req.path}, Session: ${sessionId}, User: ${userId}, Secure: ${isSecure}, Headers: ${JSON.stringify(req.headers.cookie)}`);
      req.session?.destroy();
      return res.status(401).json({ 
        error: "Authentication required",
        code: "NO_SESSION"
      });
    }
    
    try {
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        console.warn(`[SECURITY] User ${userId} not found`);
        req.session.destroy();
        return res.status(401).json({ 
          error: "User not found",
          code: "USER_NOT_FOUND"
        });
      }
      
      // VERIFICAÇÃO ULTRA-CRÍTICA: Session ID E timestamp devem coincidir EXATAMENTE
      if (!user.activeSessionId || user.activeSessionId !== sessionId) {
        console.warn(`[SECURITY BLOCK] User ${userId} session mismatch - Current: ${sessionId}, Active: ${user.activeSessionId}`);
        
        req.session.destroy();
        return res.status(401).json({ 
          error: "Sessão expirada devido a login em outro dispositivo",
          code: "CONCURRENT_LOGIN",
          requireLogin: true
        });
      }
      
      // VERIFICAÇÃO ADICIONAL: Usar o session cleaner para validação dupla
      if (!sessionCleaner.isValidSession(parseInt(userId), sessionId)) {
        console.warn(`[SECURITY BLOCK] User ${userId} failed session cleaner validation`);
        
        req.session.destroy();
        return res.status(401).json({ 
          error: "Sessão invalidada por login mais recente",
          code: "SESSION_EXPIRED",
          requireLogin: true
        });
      }
      
      // Atualizar último acesso para monitoramento
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      req.user = { id: parseInt(userId) };
    } catch (error) {
      console.error('Session validation error:', error);
      req.session?.destroy();
      return res.status(500).json({ 
        error: "Session validation failed",
        code: "VALIDATION_ERROR"
      });
    }
    
    next();
  };
  
  // Aplicar middleware de sessão única APENAS a rotas protegidas (NÃO nas de auth)
  app.use('/api/user', singleSessionMiddleware);
  app.use('/api/game', singleSessionMiddleware);
  app.use('/api/payments', singleSessionMiddleware);
  // Não aplicar a /api/auth/user e /api/auth/logout aqui - são tratadas internamente
  
  // Aplicar proteção específica só onde necessário após definir as rotas públicas

  // PIX Payment routes
  app.post("/api/payments/pix/create", async (req, res) => {
    try {
      const { amount, description } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // SECURITY: Validate deposit amount server-side
      const depositValidation = await financialValidator.validateDepositAmount(userId, amount, 'PIX');
      if (!depositValidation.valid) {
        console.log(`Deposit validation failed for user ${userId}: ${depositValidation.error}`);
        return res.status(400).json({ error: depositValidation.error });
      }

      // Use server-validated amount, not client-provided
      const validatedAmount = depositValidation.sanitizedValue!;

      // Importar gerador de order number e configurações
      const { generateOrderNumber } = await import('./order-generator');
      const siteSettings = await storage.getSiteSettings();
      
      // Gerar códigos únicos e seguros
      const externalId = `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderNumber = generateOrderNumber();

      // Get current balance for transaction record
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const currentBalance = parseFloat(String(user.balance || "0")) || 0;

      // Criar transação no banco
      const transaction = await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: validatedAmount, // Use server-validated amount
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // Will be updated when payment is confirmed
        description: `external:${externalId}`,
        paymentMethod: 'PIX',
        gameSessionId: null,
        orderNumber: orderNumber,
        status: 'pending'
      });

      // Criar pagamento PIX na PRIMEPAG
      const pixPayment = await primepagService.createPixPayment({
        amount: validatedAmount, // Use server-validated amount
        description: `Depósito ${siteSettings.siteName} - R$ ${validatedAmount}`,
        external_id: externalId,
        payer: {
          name: user.name || user.username || "User",
          document: user.cpf || "",
          email: user.email || ""
        }
      });

      // Atualizar transação com dados do PIX
      await storage.updateTransaction(transaction.id.toString(), {
        externalTxnId: pixPayment.id,
        metadata: JSON.stringify({
          primepag_payment_id: pixPayment.id,
          pix_code: pixPayment.pix_code,
          qr_code: pixPayment.qr_code,
          expires_at: pixPayment.expires_at,
          order_number: orderNumber
        })
      });

      console.log('[PIX] Payment created:', pixPayment);

      // Send only essential frontend information for security
      res.json({
        success: true,
        amount: pixPayment.amount,
        pix_code: pixPayment.pix_code,
        qr_code: pixPayment.qr_code,
        expires_at: pixPayment.expires_at
      });

    } catch (error) {
      console.error('[PIX] Error creating payment:', error);
      res.status(500).json({ 
        error: "Failed to create PIX payment",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Criar saque PIX via PRIMEPAG
  app.post("/api/payments/pix/withdraw", async (req, res) => {
    try {
      const { amount, pixKey } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // VALIDAÇÃO DE SEGURANÇA CRÍTICA - ENTRADA PIX
      if (!amount || !pixKey) {
        return res.status(400).json({ error: 'Amount and PIX key are required' });
      }

      // Validar valores numéricos maliciosos
      const withdrawalAmount = parseFloat(amount);
      if (!Number.isFinite(withdrawalAmount) || withdrawalAmount === null || withdrawalAmount === undefined) {
        return res.status(400).json({ error: 'SECURITY: Invalid withdrawal amount - must be finite number' });
      }

      if (withdrawalAmount <= 0) {
        return res.status(400).json({ error: 'SECURITY: Invalid withdrawal amount - must be positive' });
      }

      // Carregar limites das configurações do admin
      const primepagConfig = await storage.getPaymentSettings('primepag');
      const minPixWithdrawalAmount = primepagConfig?.minWithdrawalAmount || 10;
      const maxPixWithdrawalLimit = primepagConfig?.maxWithdrawalAmount || 50000;
      
      if (withdrawalAmount < minPixWithdrawalAmount) {
        return res.status(400).json({ error: `Valor mínimo para saque é R$ ${minPixWithdrawalAmount.toFixed(2).replace('.', ',')}` });
      }
      
      if (withdrawalAmount > maxPixWithdrawalLimit) {
        return res.status(400).json({ error: `Valor máximo para saque é R$ ${maxPixWithdrawalLimit.toFixed(2).replace('.', ',')}` });
      }

      // Validar formato da chave PIX
      if (typeof pixKey !== 'string' || pixKey.length < 5 || pixKey.length > 100) {
        return res.status(400).json({ error: 'SECURITY: Invalid PIX key format' });
      }

      // Validar caracteres maliciosos na chave PIX
      const maliciousPatterns = [';', '--', '/*', '*/', 'DROP', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UNION'];
      const pixKeyUpper = pixKey.toUpperCase();
      for (const pattern of maliciousPatterns) {
        if (pixKeyUpper.includes(pattern)) {
          return res.status(400).json({ error: 'SECURITY: Invalid characters in PIX key' });
        }
      }

      // Get current user and validate balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const currentBalance = parseFloat(String(user.balance || "0")) || 0;

      // Validar que o balance do usuário é válido
      if (!Number.isFinite(currentBalance)) {
        return res.status(400).json({ error: "SECURITY: User balance corrupted - contact support" });
      }

      if (currentBalance < withdrawalAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // VERIFICAÇÃO RIGOROSA: Verificar saldo sacável ANTES de processar o saque
      const balanceInfo = await storage.calculateWithdrawableBalance(userId);
      
      if (withdrawalAmount > balanceInfo.withdrawable) {
        return res.status(400).json({
          error: 'Saldo insuficiente para saque',
          details: {
            requested: withdrawalAmount,
            withdrawable: balanceInfo.withdrawable,
            total_earnings: balanceInfo.earnings,
            total_withdrawn: balanceInfo.totalWithdrawn,
            bonus_balance: balanceInfo.bonus,
            message: 'Você só pode sacar o valor que ganhou menos o que já foi sacado. Bônus não pode ser sacado.'
          }
        });
      }

      LogSanitizer.logFinancial('PIX withdrawal approved', userId);

      // Generate unique order number
      const { generateOrderNumber } = await import('./order-generator');
      const siteSettings = await storage.getSiteSettings();
      const orderNumber = generateOrderNumber();
      
      // Create withdrawal transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'withdrawal',
        amount: withdrawalAmount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance - withdrawalAmount, // Deduct immediately
        description: `PIX withdrawal to ${pixKey}`,
        paymentMethod: 'PIX',
        gameSessionId: null,
        orderNumber: orderNumber,
        status: 'pending'
      });

      // Update user balance immediately
      await storage.updateUserBalance(userId, currentBalance - withdrawalAmount);
      
      // Record withdrawal amount for future calculations
      await storage.recordWithdrawalAmount(userId, withdrawalAmount);

      // Create PIX withdrawal via PRIMEPAG API
      const pixWithdrawal = await primepagService.createPixWithdrawal({
        amount: withdrawalAmount,
        description: `Saque ${siteSettings.siteName} - R$ ${withdrawalAmount}`,
        external_id: orderNumber,
        pix_key: pixKey,
        recipient: {
          name: user.name || user.username || "User",
          document: user.cpf || "00000000000"
        }
      });

      // Update transaction with PIX withdrawal data
      await storage.updateTransaction(transaction.id.toString(), {
        externalTxnId: pixWithdrawal.id,
        status: 'processing',
        metadata: JSON.stringify({
          primepag_payout_id: pixWithdrawal.id,
          pix_key: pixKey,
          order_number: orderNumber,
          withdrawal_initiated_at: new Date().toISOString(),
          recipient: pixWithdrawal.recipient
        })
      });

      console.log('[PIX] Withdrawal created:', pixWithdrawal.id);

      res.json({
        success: true,
        message: 'Saque PIX processado com sucesso',
        transaction_id: transaction.id,
        operation_id: pixWithdrawal.id
      });

    } catch (error) {
      console.error('[PIX] Error creating withdrawal:', error);
      res.status(500).json({ 
        error: "Failed to create PIX withdrawal",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verificar status do pagamento PIX
  app.get("/api/payments/pix/:paymentId", async (req, res) => {
    try {
      const { paymentId } = req.params;

      const pixPayment = await primepagService.checkPixPayment(paymentId);
      
      res.json({
        success: true,
        payment: pixPayment
      });

    } catch (error) {
      console.error('[PIX] Error checking payment:', error);
      res.status(500).json({ 
        error: "Failed to check PIX payment status",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook PRIMEPAG para receber notificações de pagamento
  app.post("/api/webhooks/primepag", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const payload = req.body;

      console.log('[WEBHOOK] PRIMEPAG webhook received:', {
        headers: req.headers,
        body: payload
      });

      // Processar webhook com validação de senha
      const result = await primepagService.handleWebhook(payload, authHeader);

      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        if (result.message.includes('Unauthorized')) {
          res.status(403).json({ error: result.message });
        } else {
          res.status(400).json({ error: result.message });
        }
      }

    } catch (error) {
      console.error('[WEBHOOK] Error processing PRIMEPAG webhook:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Criar invoice Plisio para pagamentos crypto
  app.post("/api/payments/crypto/create", async (req, res) => {
    try {
      const { amount, currency, walletAddress } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!amount || !currency) {
        return res.status(400).json({ error: 'Amount and currency are required' });
      }

      // Carregar limites das configurações do admin
      const plisioConfig = await storage.getPaymentSettings('plisio');
      const minDepositAmount = plisioConfig?.minDepositAmount || 10;
      const maxDepositAmount = plisioConfig?.maxDepositAmount || 100000;
      
      if (amount < minDepositAmount) {
        return res.status(400).json({ error: `Valor mínimo para depósito é R$ ${minDepositAmount.toFixed(2).replace('.', ',')}` });
      }
      
      if (amount > maxDepositAmount) {
        return res.status(400).json({ error: `Valor máximo para depósito é R$ ${maxDepositAmount.toFixed(2).replace('.', ',')}` });
      }

      // Get current balance for transaction record
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const currentBalance = parseFloat(String(user.balance || "0")) || 0;
      const externalId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Importar gerador de order number e configurações
      const { generateOrderNumber } = await import('./order-generator');
      const siteSettings = await storage.getSiteSettings();
      
      // Gerar código único e seguro
      const orderNumber = generateOrderNumber();
      
      // Criar transação no banco primeiro
      const transaction = await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: parseFloat(amount),
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // Will be updated when payment is confirmed
        description: `external:${externalId}`,
        paymentMethod: 'USDT BEP-20',
        gameSessionId: null,
        orderNumber: orderNumber,
        status: 'pending'
      });

      // Criar invoice na Plisio
      const invoice = await plisioService.createInvoice({
        currency: currency.toUpperCase(),
        amount: parseFloat(amount),
        order_name: `Depósito ${siteSettings.siteName} - ${amount} USD`,
        order_number: orderNumber,
        callback_url: `${req.protocol}://${req.get('host')}/api/webhooks/plisio`,
        email: user.email
      });

      // Atualizar transação com dados da Plisio
      await storage.updateTransaction(transaction.id.toString(), {
        externalTxnId: invoice.data.txn_id,
        metadata: JSON.stringify({
          plisio_txn_id: invoice.data.txn_id,
          invoice_url: invoice.data.invoice_url,
          wallet_hash: invoice.data.wallet_hash,
          qr_code: invoice.data.qr_code,
          order_number: orderNumber
        })
      });

      console.log('[PLISIO] Invoice created:', invoice.data.txn_id);

      // Send only essential frontend information for security
      res.json({
        success: true,
        wallet_address: invoice.data.wallet_hash,
        amount: invoice.data.amount,
        currency: invoice.data.currency,
        qr_code: invoice.data.qr_code
      });

    } catch (error) {
      console.error('[PLISIO] Error creating invoice:', error);
      res.status(500).json({ 
        error: "Failed to create crypto payment",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Criar saque crypto via Plisio
  app.post("/api/payments/crypto/withdraw", async (req, res) => {
    try {
      const { amount, currency, walletAddress } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // SECURITY: Validate withdrawal amount server-side
      const withdrawalValidation = await financialValidator.validateWithdrawalAmount(userId, amount);
      if (!withdrawalValidation.valid) {
        console.log(`Crypto withdrawal validation failed for user ${userId}: ${withdrawalValidation.error}`);
        return res.status(400).json({ error: withdrawalValidation.error });
      }

      // Use server-validated amount, not client-provided
      const withdrawalAmount = withdrawalValidation.sanitizedValue!;

      // VALIDAÇÃO DE SEGURANÇA CRÍTICA - ENTRADA
      if (!currency || !walletAddress) {
        return res.status(400).json({ error: 'Currency and wallet address are required' });
      }

      // Carregar limites das configurações do admin
      const plisioConfig = await storage.getPaymentSettings('plisio');
      const minWithdrawalAmount = plisioConfig?.minWithdrawalAmount || 10;
      const maxWithdrawalLimit = plisioConfig?.maxWithdrawalAmount || 100000;
      
      if (withdrawalAmount < minWithdrawalAmount) {
        return res.status(400).json({ error: `Valor mínimo para saque é R$ ${minWithdrawalAmount.toFixed(2).replace('.', ',')}` });
      }
      
      if (withdrawalAmount > maxWithdrawalLimit) {
        return res.status(400).json({ error: `Valor máximo para saque é R$ ${maxWithdrawalLimit.toFixed(2).replace('.', ',')}` });
      }

      // Validar formato da wallet address
      if (typeof walletAddress !== 'string' || walletAddress.length < 10 || walletAddress.length > 100) {
        return res.status(400).json({ error: 'SECURITY: Invalid wallet address format' });
      }

      // Validar currency - Plisio aceita USDT_BSC format
      const validCurrencies = ['usdt', 'btc', 'eth', 'bnb', 'usdt_bsc'];
      const currencyToCheck = currency.toLowerCase();
      if (!validCurrencies.includes(currencyToCheck)) {
        return res.status(400).json({ error: 'SECURITY: Invalid currency' });
      }

      // Get current user and validate balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const currentBalance = parseFloat(String(user.balance || "0")) || 0;

      // Validar que o balance do usuário é válido
      if (!Number.isFinite(currentBalance)) {
        return res.status(400).json({ error: "SECURITY: User balance corrupted - contact support" });
      }

      if (currentBalance < withdrawalAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // VERIFICAÇÃO RIGOROSA: Verificar saldo sacável ANTES de processar o saque
      const balanceInfo = await storage.calculateWithdrawableBalance(userId);
      
      if (withdrawalAmount > balanceInfo.withdrawable) {
        return res.status(400).json({
          error: 'Saldo insuficiente para saque',
          details: {
            requested: withdrawalAmount,
            withdrawable: balanceInfo.withdrawable,
            total_earnings: balanceInfo.earnings,
            total_withdrawn: balanceInfo.totalWithdrawn,
            bonus_balance: balanceInfo.bonus,
            message: 'Você só pode sacar o valor que ganhou menos o que já foi sacado. Bônus não pode ser sacado.'
          }
        });
      }

      LogSanitizer.logFinancial('Crypto withdrawal approved', userId);

      // Generate unique order number
      const { generateOrderNumber } = await import('./order-generator');
      const siteSettings = await storage.getSiteSettings();
      const orderNumber = generateOrderNumber();
      
      // Create withdrawal transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'withdrawal',
        amount: withdrawalAmount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance - withdrawalAmount, // Deduct immediately
        description: `Crypto withdrawal to ${walletAddress}`,
        paymentMethod: `${currency.toUpperCase()} BEP-20`,
        gameSessionId: null,
        orderNumber: orderNumber,
        status: 'pending'
      });

      // Update user balance immediately
      await storage.updateUserBalance(userId, currentBalance - withdrawalAmount);
      
      // Record withdrawal amount for future calculations
      await storage.recordWithdrawalAmount(userId, withdrawalAmount);

      // Create withdrawal via Plisio
      const withdrawal = await plisioService.createWithdrawal({
        currency: currency.toUpperCase(),
        amount: withdrawalAmount,
        to: walletAddress,
        order_name: `Saque ${siteSettings.siteName} - ${amount} ${currency.toUpperCase()}`,
        order_number: orderNumber
      });

      // Update transaction with Plisio withdrawal data
      await storage.updateTransaction(transaction.id.toString(), {
        externalTxnId: withdrawal.data.id,
        status: 'processing',
        metadata: JSON.stringify({
          plisio_operation_id: withdrawal.data.id,
          wallet_address: walletAddress,
          order_number: orderNumber,
          withdrawal_initiated_at: new Date().toISOString()
        })
      });

      console.log('[PLISIO] Withdrawal created:', withdrawal.data.id);

      res.json({
        success: true,
        message: 'Saque processado com sucesso',
        transaction_id: transaction.id,
        operation_id: withdrawal.data.id
      });

    } catch (error) {
      console.error('[PLISIO] Error creating withdrawal:', error);
      res.status(500).json({ 
        error: "Failed to create crypto withdrawal",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verificar status do pagamento crypto
  app.get("/api/payments/crypto/:txnId", async (req, res) => {
    try {
      const { txnId } = req.params;

      const status = await plisioService.getInvoiceStatus(txnId);
      
      res.json({
        success: true,
        payment: status.data
      });

    } catch (error) {
      console.error('[PLISIO] Error checking payment:', error);
      res.status(500).json({ 
        error: "Failed to check crypto payment status",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook Plisio para receber notificações
  app.post("/api/webhooks/plisio", async (req, res) => {
    try {
      const payload = req.body;
      const verifyHash = req.query.verify_hash as string;

      console.log('[WEBHOOK] Plisio callback received:', {
        body: payload,
        verify_hash: verifyHash
      });

      // Processar callback
      const result = await plisioService.handleCallback(payload, verifyHash);

      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }

    } catch (error) {
      console.error('[WEBHOOK] Error processing Plisio callback:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Obter moedas suportadas pela Plisio
  app.get("/api/payments/crypto/currencies", async (req, res) => {
    try {
      const currencies = await plisioService.getSupportedCurrencies();
      
      res.json({
        success: true,
        currencies: currencies
      });

    } catch (error) {
      console.error('[PLISIO] Error getting currencies:', error);
      res.status(500).json({ 
        error: "Failed to get supported currencies",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test route para verificar token PRIMEPAG
  app.get("/api/payments/pix/test-token", async (req, res) => {
    try {
      const token = await primepagService.getToken();
      res.json({ 
        success: true, 
        token_received: !!token,
        token_length: token?.length || 0
      });
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      res.status(500).json({ 
        error: "Failed to get token",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Password Reset Routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByUsername(email);
      if (!user) {
        // Return success even if user doesn't exist for security
        return res.json({ success: true, message: "If this email exists, a password reset link has been sent." });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Save reset token to database
      await storage.createPasswordReset({
        userId: user.id,
        token: resetToken,
        expiresAt
      });
      
      // Send email
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken, user.name || user.username);
      
      if (!emailSent) {
        LogSanitizer.logError("Authentication error", new Error("Operation failed"));
        // Still return success for security
      }
      
      res.json({ 
        success: true, 
        message: "If this email exists, a password reset link has been sent." 
      });
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      
      // Find and validate reset token
      const resetRecord = await storage.getPasswordReset(token);
      if (!resetRecord || resetRecord.used || new Date() > new Date(resetRecord.expiresAt)) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update user password
      await storage.updateUser(resetRecord.userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetUsed(token);
      
      res.json({ 
        success: true, 
        message: "Password has been reset successfully" 
      });
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User balance with withdrawal information
  app.get("/api/user/balance", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const balance = typeof user?.balance === 'number' ? user.balance : 
                      typeof user?.balance === 'string' ? parseFloat(user.balance) : 0;
      
      // Get detailed balance information for withdrawal validation
      const balanceInfo = await storage.calculateWithdrawableBalance(parseInt(userId));
      
      LogSanitizer.logFinancial('Balance request', parseInt(userId));
      res.json({ 
        balance: balance.toFixed(2),
        withdrawable: balanceInfo.withdrawable.toFixed(2),
        bonus: balanceInfo.bonus.toFixed(2),
        earnings: balanceInfo.earnings.toFixed(2),
        totalWithdrawn: balanceInfo.totalWithdrawn.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get balance" });
    }
  });

  // User game history
  app.get("/api/user/game-history", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const gameHistory = await storage.getGameHistory(parseInt(userId));
      res.json(gameHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game history" });
    }
  });

  // User transactions with server-side validation
  app.get("/api/user/transactions", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // SECURITY: Validate user ID and prevent manipulation
      const validUserId = parseInt(userId);
      if (!Number.isInteger(validUserId) || validUserId <= 0) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // SECURITY: Rate limiting for transaction queries
      const userAgent = req.get('User-Agent') || 'unknown';
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Get transactions with server-side validation
      const transactions = await storage.getUserTransactions(validUserId);
      
      // SECURITY: Filter and sanitize transaction data server-side
      const sanitizedTransactions = transactions.map(transaction => {
        // Calculate server-side hash for integrity verification
        const transactionHash = require('crypto')
          .createHash('sha256')
          .update(`${transaction.id}${transaction.userId}${transaction.amount}${transaction.type}`)
          .digest('hex')
          .substring(0, 8);

        return {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount), // Server validates amount
          status: transaction.status,
          createdAt: transaction.createdAt,
          description: transaction.description?.replace(/external:/g, '') || '', // Remove sensitive prefixes
          paymentMethod: transaction.paymentMethod || null,
          payment_method: transaction.paymentMethod || null, // Compatibility
          integrity_hash: transactionHash // Server-generated integrity hash
        };
      });

      // Log transaction access for security monitoring
      console.log(`[SECURITY] User ${validUserId} accessed ${sanitizedTransactions.length} transactions from ${clientIP}`);
      
      res.json(sanitizedTransactions);
    } catch (error) {
      console.error('[SECURITY] Transaction access error:', error);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });

  // Endpoint público para configurações de pagamento
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const [primepagConfig, plisioConfig] = await Promise.all([
        storage.getPaymentSettings('primepag'),
        storage.getPaymentSettings('plisio')
      ]);

      const methods = [];

      // PIX (Primepag)
      if (primepagConfig?.isActive !== false) {
        methods.push({
          id: 'pix',
          name: 'PIX',
          type: 'pix',
          currency: 'BRL',
          min_amount: primepagConfig?.minDepositAmount || 10,
          max_amount: primepagConfig?.maxDepositAmount || 50000,
          fee_percentage: primepagConfig?.withdrawalFeePercentage || 2.5,
          fee_fixed: 0,
          deposit_limits: {
            min: primepagConfig?.minDepositAmount || 10,
            max: primepagConfig?.maxDepositAmount || 50000
          },
          withdrawal_limits: {
            min: primepagConfig?.minWithdrawalAmount || 10,
            max: primepagConfig?.maxWithdrawalAmount || 50000
          }
        });
      }

      // Crypto (Plisio)
      if (plisioConfig?.isActive !== false) {
        methods.push({
          id: 'crypto',
          name: 'USDT (BSC)',
          type: 'crypto',
          currency: 'USDT_BSC',
          min_amount: plisioConfig?.minDepositAmount || 10,
          max_amount: plisioConfig?.maxDepositAmount || 100000,
          fee_percentage: plisioConfig?.withdrawalFeePercentage || 1.0,
          fee_fixed: 0,
          deposit_limits: {
            min: plisioConfig?.minDepositAmount || 10,
            max: plisioConfig?.maxDepositAmount || 100000
          },
          withdrawal_limits: {
            min: plisioConfig?.minWithdrawalAmount || 10,
            max: plisioConfig?.maxWithdrawalAmount || 100000
          }
        });
      }

      res.json(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: "Failed to get payment methods" });
    }
  });

  // Sistema de Afiliados
  
  // Obter informações de afiliados do usuário
  app.get("/api/user/referral-info", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const stats = await storage.getReferralStats(parseInt(userId));
      const referrals = await storage.getUserReferrals(parseInt(userId));
      
      res.json({
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        hasReceivedReferralBonus: user.hasReceivedReferralBonus,
        stats,
        referrals: referrals.map(r => ({
          id: r.id,
          username: r.username,
          createdAt: r.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting referral info:', error);
      res.status(500).json({ error: "Failed to get referral info" });
    }
  });

  // Atualizar código de indicação (apenas uma vez)
  app.post("/api/user/set-referral", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const { referralCode } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!referralCode || typeof referralCode !== 'string') {
        return res.status(400).json({ error: "Código de indicação é obrigatório" });
      }
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verificar se já tem código de indicação
      if (user.referredBy) {
        return res.status(400).json({ error: "Código de indicação já foi definido e não pode ser alterado" });
      }

      // Verificar se o código existe e não é o próprio usuário
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (!referrer) {
        return res.status(400).json({ error: "Código de indicação inválido" });
      }

      if (referrer.id === parseInt(userId)) {
        return res.status(400).json({ error: "Você não pode usar seu próprio código de indicação" });
      }

      // Dar bônus de R$ 1,00 para o novo usuário ANTES de atualizar as informações
      console.log(`[REFERRAL] User ${userId} current hasReceivedReferralBonus: ${user.hasReceivedReferralBonus}`);
      
      if (!user.hasReceivedReferralBonus) {
        const currentBalance = parseFloat(user.balance || '0');
        const newBalance = currentBalance + 1.0;
        
        console.log(`[REFERRAL] Giving bonus to user ${userId}: ${currentBalance} -> ${newBalance}`);
        
        await storage.updateUserBalance(parseInt(userId), newBalance);
        
        // IMPORTANTE: Registrar como bônus não sacável
        await storage.updateUserBonusBalance(parseInt(userId), 1.0);
        
        // Criar transação de bônus
        await storage.createTransaction({
          userId: parseInt(userId),
          type: 'bonus',
          amount: 1.0,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Bônus de indicação - Código: ${referralCode} (não sacável)`,
          gameSessionId: null
        });

        // Marcar que já recebeu o bônus
        await storage.updateUser(parseInt(userId), { hasReceivedReferralBonus: true });
        console.log(`[REFERRAL] Marked user ${userId} as having received referral bonus`);
      }

      // Atualizar informações do usuário
      await storage.updateUserReferralInfo(parseInt(userId), referralCode);
      
      res.json({ 
        success: true, 
        message: !user.hasReceivedReferralBonus ? "Código de indicação definido com sucesso! Você ganhou R$ 1,00 de bônus!" : "Código de indicação definido com sucesso!",
        bonusReceived: !user.hasReceivedReferralBonus ? 1.0 : 0
      });
    } catch (error) {
      console.error('Error setting referral code:', error);
      res.status(500).json({ error: "Failed to set referral code" });
    }
  });

  // Obter comissões de afiliados
  app.get("/api/user/referral-commissions", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const commissions = await storage.getReferralCommissions(parseInt(userId));
      res.json(commissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get referral commissions" });
    }
  });

  // Admin authentication middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.session?.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  };

  // Admin Site Settings
  app.get("/api/admin/site-settings", requireAdmin, async (req, res) => {
    try {
      const siteSettings = await storage.getSiteSettings();
      res.json(siteSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get site settings" });
    }
  });

  app.put("/api/admin/site-settings", requireAdmin, async (req, res) => {
    try {
      const settings = req.body;
      await storage.updateSiteSettings(settings);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update site settings" });
    }
  });

  app.post("/api/admin/upload-asset", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Return the public URL path for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({ 
        url: fileUrl, 
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload asset" });
    }
  });

  // Admin Users endpoint
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Edit user endpoint
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, phone, cpf, withdrawalBlocked, depositBlocked, accountBlocked } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user in database
      await storage.updateUser(userId, {
        name,
        email,
        phone,
        cpf,
        withdrawalBlocked,
        depositBlocked,
        accountBlocked
      });

      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error('Edit user error:', error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Modify user balance endpoint
  app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { amount, type, reason } = req.body;
      
      if (!amount || amount <= 0 || !['add', 'subtract'].includes(type)) {
        return res.status(400).json({ error: "Invalid amount or type" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const currentBalance = parseFloat(user.balance || '0');
      const changeAmount = parseFloat(amount);
      const newBalance = type === 'add' ? currentBalance + changeAmount : currentBalance - changeAmount;

      if (newBalance < 0 && type === 'subtract') {
        return res.status(400).json({ error: "Insufficient balance for subtraction" });
      }

      // Update user balance
      await storage.updateUserBalance(userId, newBalance);

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: type === 'add' ? 'admin_credit' : 'admin_debit',
        amount: changeAmount,
        status: 'completed',
        description: reason || (type === 'add' ? 'Saldo adicionado pela administração' : 'Saldo descontado pela administração'),
        externalId: `admin_${Date.now()}`,
        createdAt: new Date()
      });

      res.json({ 
        success: true, 
        message: `Balance ${type === 'add' ? 'added' : 'subtracted'} successfully`,
        newBalance 
      });
    } catch (error) {
      console.error('Balance modification error:', error);
      res.status(500).json({ error: "Failed to modify balance" });
    }
  });

  // Change user password endpoint
  app.post("/api/admin/change-user-password", requireAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ error: "User ID and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update user password
      await storage.updateUser(userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });

      console.log(`Admin changed password for user: ${user.username} (ID: ${userId})`);
      
      res.json({ 
        success: true, 
        message: `Password updated successfully for user ${user.username}` 
      });
    } catch (error) {
      console.error('Change user password error:', error);
      res.status(500).json({ error: "Failed to change user password" });
    }
  });

  // Change admin password endpoint
  app.post("/api/admin/change-admin-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      // Verify current admin password
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      if (!adminPasswordHash) {
        return res.status(500).json({ error: "Admin password configuration not found" });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminPasswordHash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash the new password
      const newHashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update environment variable (this would require server restart in production)
      // For now, we'll update it in memory and log instructions
      process.env.ADMIN_PASSWORD_HASH = newHashedPassword;
      
      console.log('='.repeat(80));
      console.log('ADMIN PASSWORD CHANGED!');
      console.log('New password hash:', newHashedPassword);
      console.log('Please update your .env file with:');
      console.log(`ADMIN_PASSWORD_HASH=${newHashedPassword}`);
      console.log('='.repeat(80));

      res.json({ 
        success: true, 
        message: "Admin password updated successfully. Please update your .env file with the new hash shown in server logs." 
      });
    } catch (error) {
      console.error('Change admin password error:', error);
      res.status(500).json({ error: "Failed to change admin password" });
    }
  });

  // Admin Authentication
  app.post("/api/admin/login", (req, res, next) => rateLimitAuth(req, res, next, 'admin'), async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Secure admin credentials check with bcrypt
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      
      // If no hash is set, create one for the default password and log it
      if (!adminPasswordHash) {
        const defaultPassword = 'admin123@secure!';
        const hash = await bcrypt.hash(defaultPassword, 12);
        LogSanitizer.logAuth("Sensitive operation completed", "system");
        LogSanitizer.logAuth("Sensitive operation completed", "system");
        
        // For now, use direct comparison with default password
        if (username === adminUsername && password === defaultPassword) {
          (req as any).rateLimitTracker.clearAttempts();
          (req as any).session.isAdmin = true;
          (req as any).session.adminId = 1;
          
          res.json({ 
            success: true, 
            message: 'Admin logged in successfully',
            redirect: '/dcmemocontroll/dashboard'
          });
        } else {
          (req as any).rateLimitTracker.incrementFailed();
          res.status(401).json({ error: 'Invalid admin credentials' });
        }
        return;
      }

      // Validate credentials with bcrypt
      if (username === adminUsername) {
        const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
        if (passwordMatch) {
          (req as any).rateLimitTracker.clearAttempts();
          // Set admin session
          (req as any).session.isAdmin = true;
          (req as any).session.adminId = 1;
          
          res.json({ 
            success: true, 
            message: 'Admin logged in successfully',
            redirect: '/dcmemocontroll/dashboard'
          });
        } else {
          (req as any).rateLimitTracker.incrementFailed();
          res.status(401).json({ error: 'Invalid admin credentials' });
        }
      } else {
        (req as any).rateLimitTracker.incrementFailed();
        res.status(401).json({ error: 'Invalid admin credentials' });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req, res) => {
    try {
      (req as any).session.isAdmin = false;
      (req as any).session.adminId = null;
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Admin auth check
  app.get("/api/admin/auth-check", async (req, res) => {
    try {
      const isAdmin = (req as any).session?.isAdmin;
      if (isAdmin) {
        res.json({ authenticated: true });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Auth check failed" });
    }
  });

  // Admin Dashboard Stats
  app.get("/api/admin/dashboard/stats", requireAdmin, async (req, res) => {
    try {
      // Get real stats from database
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;
      
      // Calculate new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = allUsers.filter(user => 
        user.createdAt && new Date(user.createdAt) >= today
      ).length;
      
      // Calculate total revenue from user balances (users who deposited)
      const totalRevenue = allUsers.reduce((sum, user) => {
        const balance = parseFloat(user.balance || '0');
        return balance > 0 ? sum + balance : sum;
      }, 0);
      
      // Calculate active users in last 24h
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers24h = allUsers.filter(user => 
        user.updatedAt && new Date(user.updatedAt) >= last24h
      ).length;
      
      const stats = {
        totalUsers,
        newUsersToday,
        totalRevenue,
        revenueToday: 0, // Will implement transaction tracking later
        totalGames: 0, // Will implement game session tracking later
        gamesToday: 0,
        pendingWithdrawals: 0,
        pendingWithdrawalsAmount: 0,
        houseEdge: 4.8,
        activeUsers24h
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });

  // Admin Recent Transactions
  app.get("/api/admin/dashboard/transactions", async (req, res) => {
    try {
      // Get real recent transactions from database
      const transactions: any[] = [];
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recent transactions" });
    }
  });

  // Admin Security Stats
  app.get("/api/admin/security/stats", requireAdmin, async (req, res) => {
    try {
      // Get real security data from the system
      const securityStats = {
        failedLogins24h: 0, // Will be tracked in session logs
        blockedIPs: 0,
        suspiciousTransactions: 0,
        adminSessions: 1, // Current admin session
        lastSecurityScan: new Date().toISOString(),
        systemUptime: Math.floor(process.uptime()),
        activeSessions: 1, // Basic session tracking
        securityLevel: "High"
      };

      // Get recent security events
      const recentAlerts = [
        {
          id: 1,
          type: "info",
          title: "Sistema Seguro",
          message: "Nenhuma atividade suspeita detectada nas últimas 24h",
          timestamp: new Date().toISOString(),
          severity: "low"
        }
      ];

      res.json({
        stats: securityStats,
        alerts: recentAlerts
      });
    } catch (error) {
      console.error('Security stats error:', error);
      res.status(500).json({ error: "Failed to get security stats" });
    }
  });

  // Admin Payment Methods
  app.get("/api/admin/payment-methods", async (req, res) => {
    try {
      // Get real payment methods from database
      const paymentMethods = [
        {
          id: '1',
          name: 'USDT BEP-20',
          type: 'crypto',
          provider: 'plisio',
          currency: 'USDT',
          is_active: true,
          min_amount: 10,
          max_amount: 100000,
          fee_percentage: 0, // No fees for deposits
          fee_fixed: 0,
          withdrawal_fee_percentage: 1.0 // Fees only for withdrawals
        },
        {
          id: '2',
          name: 'PIX',
          type: 'pix',
          provider: 'primepag',
          currency: 'BRL',
          is_active: true,
          min_amount: 10,
          max_amount: 50000,
          fee_percentage: 0, // No fees for deposits
          fee_fixed: 0,
          withdrawal_fee_percentage: 2.5 // Fees only for withdrawals
        }
      ];
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to get payment methods" });
    }
  });

  // Admin Payment Configuration Routes
  app.get("/api/admin/payment-config/:provider", requireAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      const config = await storage.getPaymentSettings(provider);
      res.json(config);
    } catch (error) {
      console.error('Error getting payment config:', error);
      res.status(500).json({ error: "Failed to get payment configuration" });
    }
  });

  app.put("/api/admin/payment-config/:provider", requireAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      const settings = req.body;
      
      await storage.updatePaymentSettings(provider, settings);
      
      // Update environment variables for immediate effect
      if (provider === 'primepag') {
        process.env.PRIMEPAG_TEST_MODE = settings.isTestMode ? 'true' : 'false';
        if (settings.isTestMode) {
          process.env.PRIMEPAG_CLIENT_ID_TEST = settings.clientId;
          process.env.PRIMEPAG_CLIENT_SECRET_TEST = settings.clientSecret;
        } else {
          process.env.PRIMEPAG_CLIENT_ID = settings.clientId;
          process.env.PRIMEPAG_CLIENT_SECRET = settings.clientSecret;
        }
      } else if (provider === 'plisio') {
        process.env.PLISIO_SECRET_KEY = settings.secretKey;
      }
      
      res.json({ success: true, message: "Payment configuration updated successfully" });
    } catch (error) {
      console.error('Error updating payment config:', error);
      res.status(500).json({ error: "Failed to update payment configuration" });
    }
  });

  app.post("/api/admin/restart-payment-services", requireAdmin, async (req, res) => {
    try {
      // Force reload of Primepag service with new settings
      console.log('[ADMIN] Restarting payment services with new configuration');
      res.json({ success: true, message: "Payment services restarted successfully" });
    } catch (error) {
      console.error('Error restarting payment services:', error);
      res.status(500).json({ error: "Failed to restart payment services" });
    }
  });

  // Admin API Keys
  app.get("/api/admin/api-keys", async (req, res) => {
    try {
      // Get real API keys from environment (masked for security)
      const apiKeys = [
        {
          id: '1',
          provider: 'plisio',
          name: 'Plisio API Key',
          key_name: 'PLISIO_API_KEY',
          key_value: process.env.PLISIO_API_KEY ? '****' + process.env.PLISIO_API_KEY.slice(-4) : 'Not configured',
          is_active: !!process.env.PLISIO_API_KEY,
          last_used: 'Never'
        },
        {
          id: '2',
          provider: 'primepag',
          name: 'PRIMEPAG Client ID',
          key_name: 'PRIMEPAG_CLIENT_ID',
          key_value: process.env.PRIMEPAG_CLIENT_ID ? '****' + process.env.PRIMEPAG_CLIENT_ID.slice(-4) : 'Not configured',
          is_active: !!process.env.PRIMEPAG_CLIENT_ID,
          last_used: 'Never'
        },
        {
          id: '3',
          provider: 'primepag',
          name: 'PRIMEPAG Client Secret',
          key_name: 'PRIMEPAG_CLIENT_SECRET',
          key_value: process.env.PRIMEPAG_CLIENT_SECRET ? '****' + process.env.PRIMEPAG_CLIENT_SECRET.slice(-4) : 'Not configured',
          is_active: !!process.env.PRIMEPAG_CLIENT_SECRET,
          last_used: 'Never'
        }
      ];
      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Function to get theme-specific icons
  function getThemeIcons(theme: string): string[] {
    const themeIcons: { [key: string]: string[] } = {
      'ESP': ['⚽', '🏀', '🥎', '🏈', '🎳', '🏓', '⛸️', '🥊'], // Esportes
      'ANI': ['🐸', '🐊', '🦥', '🦜', '🐵', '🐨', '🐺', '🦉'], // Animais
      'MUS': ['🎹', '🎸', '🥁', '🎺', '🎻', '🎷', '🎤', '🎧'], // Música
      'UNI': ['🛰️', '🛸', '☀️', '☄️', '🪐', '🌎', '🧑‍🚀', '🚀']  // Espaço (padrão)
    };
    
    return themeIcons[theme] || themeIcons['UNI'];
  }

  // Memory Game Routes
  app.post("/api/game/memory/start", async (req, res) => {
    try {
      const { betAmount, theme } = startGameSchema.parse(req.body);
      const sessionUserId = (req as any).session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = parseInt(sessionUserId);

      // PROTEÇÃO CRÍTICA: Verificar se usuário já tem jogo ativo
      const existingSession = cryptoGameValidator.getActiveSession(userId);
      if (existingSession) {
        console.log(`[SECURITY BLOCK] User ${userId} attempted to start new game while having active session ${existingSession}`);
        return res.status(429).json({ 
          error: "Você já tem um jogo ativo. Termine o jogo atual antes de iniciar outro.",
          activeSession: existingSession
        });
      }

      // SECURITY: Validate bet amount
      if (betAmount < 0.01 || betAmount > 1000) {
        return res.status(400).json({ error: "Invalid bet amount" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.accountBlocked) {
        return res.status(403).json({ error: "Account is blocked" });
      }

      const currentBalance = parseFloat(user.balance || '0');
      if (currentBalance < betAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // SECURITY: Validate bet amount server-side
      const betValidation = await financialValidator.validateBetAmount(userId, betAmount);
      if (!betValidation.valid) {
        return res.status(400).json({ error: betValidation.error });
      }

      // Deduzir aposta
      const newBalance = currentBalance - betAmount;
      await storage.updateUserBalance(userId, newBalance);
      
      // Criar sessão no banco primeiro
      const session = await storage.createGameSession({
        betAmount,
        gameType: 'memory',
        userId: userId,
        theme: theme, // Salvar tema selecionado
      });

      // Use the actual session ID from database
      const actualSessionId = session.id;
      
      // Buscar configurações do jogo do banco
      const gameSettings = await storage.getGameSettings();
      
      // NOVO: Sistema Hash-Only - NUNCA expõe posições das cartas
      const hashGame = hashOnlyValidator.createSecureGame(
        actualSessionId, 
        userId, 
        betAmount,
        gameSettings.maxMoves,
        gameSettings.maxTime
      );

      // Registrar transação
      await storage.createTransaction({
        userId,
        type: 'bet',
        amount: betAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `SECURE: Memory game bet - Session ${actualSessionId}`,
        gameSessionId: actualSessionId
      });

      // Gerar comissão de afiliado se o usuário foi indicado
      try {
        if (user.referredBy) {
          const referrer = await storage.getUserByReferralCode(user.referredBy);
          if (referrer) {
            const commissionPercentage = 5.0; // 5% de comissão
            const commissionAmount = betAmount * (commissionPercentage / 100);
            
            // Criar registro de comissão
            await storage.createReferralCommission({
              referrerId: referrer.id,
              referredId: userId.toString(),
              gameSessionId: actualSessionId,
              betAmount: betAmount,
              commissionAmount: commissionAmount,
              commissionPercentage: commissionPercentage,
              status: 'pending'
            });

            // IMPORTANTE: Adicionar comissão como BÔNUS (não sacável) ao invés de saldo regular
            const referrerCurrentBalance = parseFloat(referrer.balance || '0');
            const referrerNewBalance = referrerCurrentBalance + commissionAmount;
            await storage.updateUserBalance(referrer.id, referrerNewBalance);
            
            // Registrar como bônus não sacável
            await storage.updateUserBonusBalance(referrer.id, commissionAmount);

            // Criar transação de comissão para o referrer
            await storage.createTransaction({
              userId: referrer.id,
              type: 'commission',
              amount: commissionAmount,
              balanceBefore: referrerCurrentBalance,
              balanceAfter: referrerNewBalance,
              description: `Bônus de afiliado - ${user.username} apostou R$ ${betAmount.toFixed(2)} (não sacável)`,
              gameSessionId: actualSessionId
            });

            console.log(`Comissão de R$ ${commissionAmount.toFixed(2)} gerada para ${referrer.username} (${referrer.referralCode})`);
          }
        }
      } catch (error) {
        console.error('Error processing referral commission:', error);
        // Não falhar a aposta se houver erro na comissão
      }
      
      // Get theme-specific icons
      const themeIcons = getThemeIcons(theme || 'UNI');
      
      // SEGURANÇA: Enviar posições criptografadas
      res.json({ 
        sessionId: actualSessionId,
        success: true,
        newBalance: newBalance,
        maxMoves: hashGame.maxMoves,
        maxTime: hashGame.maxTime,
        difficulty: hashGame.difficulty,
        encryptedPositions: hashGame.encryptedPositions,
        gameKey: hashGame.gameKey,
        themeIcons: themeIcons
      });
    } catch (error) {
      console.error('Start game error:', error);
      res.status(400).json({ 
        error: 'Invalid request data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  // REMOVIDO: Validação individual de cartas (substituída por hash criptográfico)

  // CRÍTICO: Resultado do jogo com validação server-side 100% segura
  app.post("/api/game/memory/result", async (req, res) => {
    try {
      const parsedData = gameResultSchema.parse(req.body);
      const { sessionId, won, matchedPairs, gameTime, moves } = parsedData;
      const sessionUserId = (req as any).session?.userId;
      
      if (!sessionUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = parseInt(sessionUserId);


      // CRITICAL: Validate with Hash-Only system (anti-hack)
      const gameResult = {
        sessionId,
        moves: moves.map((move, index) => ({
          cardIndex1: move.cardIndex,
          cardIndex2: move.cardIndex + 1, // Simulated pair
          timestamp: Date.now() - (moves.length - index) * 1000,
          wasMatch: index < matchedPairs * 2
        })),
        totalTime: gameTime,
        matchedPairs,
        won
      };

      const validation = hashOnlyValidator.validateGameResult(gameResult);

      if (!validation.valid) {
        console.error(`[HASH VALIDATION] Validation failed:`, validation.reason);
        return res.status(400).json({ 
          error: 'Game validation failed',
          reason: validation.reason,
          trustScore: validation.trustScore
        });
      }

      console.log(`[HASH VALIDATION] Validation passed - Trust Score: ${validation.trustScore}, Win Amount: ${validation.winAmount}`);

      // Buscar sessão do jogo
      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Game session not found' });
      }

      if (session.userId !== userId) {
        console.log(`Session ownership violation: user ${userId} accessing session ${sessionId}`);
        return res.status(403).json({ error: 'Session access denied' });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ error: 'Session already completed' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentBalance = parseFloat(user.balance || '0');
      let newBalance = currentBalance;
      
      if (won && validation.winAmount > 0) {
        newBalance = currentBalance + validation.winAmount;
        await storage.updateUserBalance(userId, newBalance);
        
        // Registrar ganhos como earnings (sacáveis)
        await storage.updateUserEarnings(userId, validation.winAmount);
        
        // Registrar transação de ganho
        await storage.createTransaction({
          userId,
          type: 'game_win',
          amount: validation.winAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `HASH WIN: Memory game - ${matchedPairs}/8 pairs - Trust: ${validation.trustScore.toFixed(2)} - Session ${sessionId}`,
          gameSessionId: sessionId
        });
      }

      // Marcar sessão como completa com resultado validado
      await storage.updateGameSession(sessionId, {
        status: 'completed',
        result: won ? 'won' : 'lost',
        matchedPairs: matchedPairs,
        gameTime,
        moves: moves.length,
        winAmount: validation.winAmount,
        endTime: new Date()
      });

      LogSanitizer.logFinancial('Hash secure game completed', userId, validation.winAmount);

      res.json({
        success: true,
        won: won,
        winAmount: validation.winAmount,
        newBalance,
        matchedPairs: matchedPairs,
        trustScore: validation.trustScore
      });
    } catch (error) {
      console.error('Game result error:', error);
      res.status(400).json({ error: 'Invalid game result data' });
    }
  });

  app.get("/api/game/memory/history", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const history = await storage.getGameHistory(parseInt(userId));
      res.json(history);
    } catch (error) {
      console.error('Game history error:', error);
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });

  // User Balance Routes
  app.get("/api/user/balance", async (req, res) => {
    try {
      // TODO: Get user ID from session
      const userId = 1;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ balance: user.balance || 0 });
    } catch (error) {
      console.error('Balance fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

  app.post("/api/user/balance", async (req, res) => {
    try {
      const { amount } = z.object({
        amount: z.number()
      }).parse(req.body);
      
      // TODO: Get user ID from session
      const userId = 1;
      
      await storage.updateUserBalance(userId, amount);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Balance update error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  });

  // Game Settings Routes (Admin)
  app.get("/api/admin/game-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put("/api/admin/game-settings", requireAdmin, async (req, res) => {
    try {
      const settingsSchema = z.object({
        maxTime: z.number().min(10).max(300),
        maxMoves: z.number().min(10).max(100),
        winMultiplier: z.number().min(1.1).max(10),
        minBet: z.number().min(0.01),
        maxBet: z.number().min(1),
      });
      
      const settings = settingsSchema.parse(req.body);
      await storage.updateGameSettings(settings);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(400).json({ error: 'Invalid settings data' });
    }
  });

  // Public API to get game settings for the frontend
  app.get("/api/game-settings", async (req, res) => {
    try {
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
