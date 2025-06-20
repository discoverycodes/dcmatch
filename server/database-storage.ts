import { User, InsertUser, ReferralCommission, PasswordReset, AffiliateSettings } from "../shared/schema";
import { db } from "./db";
import { users, gameSessions, transactions, referralCommissions, passwordResets, affiliateSettings, gameSettings, siteSettings, paymentSettings } from "../shared/schema";
import { eq, count, sum, desc } from "drizzle-orm";
import { generateUniqueUserToken, isValidUserToken } from './token-generator';
import postgres from 'postgres';
import { LogSanitizer, safeLog } from './log-sanitizer';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByToken(userToken: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: any): Promise<void>;
  createGameSession(data: any): Promise<any>;
  getGameSession(sessionId: string): Promise<any>;
  updateGameSession(sessionId: string, updates: any): Promise<void>;
  getGameHistory(userId: number): Promise<any[]>;
  updateUserBalance(userId: number, newBalance: number): Promise<void>;
  getGameSettings(): Promise<any>;
  updateGameSettings(settings: any): Promise<void>;
  createTransaction(transaction: any): Promise<any>;
  getTransaction(id: string): Promise<any>;
  getTransactionByExternalId(externalId: string): Promise<any>;
  getTransactionByReferenceCode(referenceCode: string): Promise<any>;
  updateTransaction(id: string, updates: any): Promise<void>;
  getUserTransactions(userId: number): Promise<any[]>;
  getPrimepagToken(): Promise<any>;
  savePrimepagToken(token: any): Promise<void>;

  // Password reset methods
  createPasswordReset(data: { userId: number; token: string; expiresAt: Date }): Promise<PasswordReset>;
  getPasswordReset(token: string): Promise<PasswordReset | undefined>;
  markPasswordResetUsed(token: string): Promise<void>;

  // Métodos de afiliados
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  updateUserReferralInfo(userId: number, referredBy: string): Promise<void>;
  createReferralCommission(commission: any): Promise<ReferralCommission>;
  getReferralStats(userId: number): Promise<any>;
  getUserReferrals(userId: number): Promise<User[]>;
  getReferralCommissions(userId: number): Promise<ReferralCommission[]>;
  generateUniqueReferralCode(): Promise<string>;

  // Métodos de token de usuário
  checkUserTokenExists(userToken: string): Promise<boolean>;

  // Métodos de configurações de afiliados
  getAffiliateSettings(): Promise<AffiliateSettings>;
  updateAffiliateSettings(settings: Partial<AffiliateSettings>): Promise<void>;

  // Métodos de configurações de pagamento
  getPaymentSettings(provider: string): Promise<any>;
  updatePaymentSettings(provider: string, settings: any): Promise<void>;

  // Métodos de verificação de saldo sacável
  calculateWithdrawableBalance(userId: number): Promise<{ withdrawable: number; total: number; bonus: number; earnings: number; totalWithdrawn: number }>;
  updateUserEarnings(userId: number, earningsAmount: number): Promise<void>;
  updateUserBonusBalance(userId: number, bonusAmount: number): Promise<void>;
  recordWithdrawalAmount(userId: number, withdrawalAmount: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private primepagToken: any;
  private affiliateSettings: AffiliateSettings | null = null;
  private balanceCalculationLocks = new Map<number, Promise<any>>();

  constructor() {
    this.primepagToken = null;
    // Initialize default game settings in database if they don't exist
    this.initializeGameSettings();
  }

  private async initializeGameSettings(): Promise<void> {
    try {
      const existingSettings = await db.select().from(gameSettings).limit(1);

      if (existingSettings.length === 0) {
        // Create default settings
        await db.insert(gameSettings).values({
          maxTime: 30,
          maxMoves: 20,
          winMultiplier: "2.00",
          minBet: "1.00",
          maxBet: "1000.00"
        });
        console.log('Default game settings initialized');
      }
    } catch (error) {
      console.error('Error initializing game settings:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(users);
      return result;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Gerar token único para o usuário
      const userToken = await generateUniqueUserToken(async (token) => {
        const result = await db.select({ id: users.id }).from(users).where(eq(users.userToken, token)).limit(1);
        return result.length > 0;
      });

      // Generate unique referral code
      const referralCode = await this.generateUniqueReferralCode();

      const userData = {
        userToken,
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email || insertUser.username,
        name: insertUser.name || insertUser.username,
        phone: insertUser.phone || null,
        cpf: insertUser.cpf || null,
        balance: "0.00",
        referralCode: referralCode
      };
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: number, updates: any): Promise<void> {
    try {
      await db.update(users)
        .set({ 
          ...updates,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async updateUserBalance(userId: number, newBalance: number): Promise<void> {
    try {
      await db.update(users)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user balance:', error);
      throw new Error('Failed to update balance');
    }
  }

  async createGameSession(data: any): Promise<any> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionData = {
        id: sessionId,
        userId: data.userId,
        gameType: data.gameType || 'memory',
        betAmount: data.betAmount.toString(),
        status: 'active',
        result: null,
        winAmount: '0',
        matchedPairs: 0,
        gameData: JSON.stringify(data.gameData || {}),
        createdAt: new Date()
      };

      const result = await db.insert(gameSessions).values(sessionData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating game session:', error);
      throw new Error('Failed to create game session');
    }
  }

  async getGameSession(sessionId: string): Promise<any> {
    try {
      const result = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting game session:', error);
      return null;
    }
  }

  async updateGameSession(sessionId: string, updates: any): Promise<void> {
    try {
      await db.update(gameSessions)
        .set({ 
          ...updates,
          updatedAt: new Date() 
        })
        .where(eq(gameSessions.id, sessionId));
    } catch (error) {
      console.error('Error updating game session:', error);
      throw new Error('Failed to update game session');
    }
  }

  async getGameHistory(userId: number): Promise<any[]> {
    try {
      const result = await db.select()
        .from(gameSessions)
        .where(eq(gameSessions.userId, userId));

      return result
        .filter(session => session.status === 'completed')
        .map(session => ({
          id: session.id,
          date: session.completedAt || session.createdAt,
          betAmount: parseFloat(session.betAmount || '0'),
          result: session.result,
          winAmount: parseFloat(session.winAmount || '0'),
          pairs: session.matchedPairs || 0,
          timeUsed: session.completedAt && session.createdAt ? 
            Math.floor((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 1000) : 0
        }))
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
    } catch (error) {
      console.error('Error getting game history:', error);
      return [];
    }
  }

  async getGameSettings(): Promise<any> {
    try {
      const result = await db.select().from(gameSettings).limit(1);

      if (result.length === 0) {
        // Return default settings and initialize database
        const defaultSettings = {
          maxTime: 30,
          maxMoves: 20,
          winMultiplier: 2.0,
          minBet: 1.0,
          maxBet: 1000.0
        };
        await this.initializeGameSettings();
        return defaultSettings;
      }

      return {
        maxTime: result[0].maxTime,
        maxMoves: result[0].maxMoves,
        winMultiplier: parseFloat(result[0].winMultiplier?.toString() || '2.0'),
        minBet: parseFloat(result[0].minBet?.toString() || '1.0'),
        maxBet: parseFloat(result[0].maxBet?.toString() || '1000.0')
      };
    } catch (error) {
      console.error('Error getting game settings:', error);
      // Return default settings as fallback
      return {
        maxTime: 30,
        maxMoves: 20,
        winMultiplier: 2.0,
        minBet: 1.0,
        maxBet: 1000.0
      };
    }
  }

  async updateGameSettings(settings: any): Promise<void> {
    try {
      const existingSettings = await db.select().from(gameSettings).limit(1);

      if (existingSettings.length === 0) {
        // Insert new settings
        await db.insert(gameSettings).values({
          maxTime: settings.maxTime || 30,
          maxMoves: settings.maxMoves || 20,
          winMultiplier: settings.winMultiplier?.toString() || '2.00',
          minBet: settings.minBet?.toString() || '1.00',
          maxBet: settings.maxBet?.toString() || '1000.00'
        });
      } else {
        // Update existing settings
        await db.update(gameSettings)
          .set({
            maxTime: settings.maxTime,
            maxMoves: settings.maxMoves,
            winMultiplier: settings.winMultiplier?.toString(),
            minBet: settings.minBet?.toString(),
            maxBet: settings.maxBet?.toString(),
            updatedAt: new Date()
          })
          .where(eq(gameSettings.id, existingSettings[0].id));
      }

      console.log('Game settings updated successfully:', settings);
    } catch (error) {
      console.error('Error updating game settings:', error);
      throw new Error('Failed to update game settings');
    }
  }

  async getPrimepagToken(): Promise<any> {
    // For now, return null to bypass token storage in memory
    // This will force the PrimePag service to generate new tokens as needed
    return null;
  }

  async savePrimepagToken(token: any): Promise<void> {
    // Skip saving tokens for now - tokens will be generated fresh as needed
    // This removes the memory storage issue completely
    LogSanitizer.logAuth("Sensitive operation completed", "system");
  }

  async createTransaction(transaction: any): Promise<any> {
    try {
      // VALIDAÇÃO DE SEGURANÇA CRÍTICA
      const userId = parseInt(transaction.userId);
      if (!transaction.userId || !Number.isInteger(userId) || userId <= 0) {
        throw new Error('SECURITY: Invalid user ID');
      }

      // Use the validated userId
      transaction.userId = userId;

      if (!transaction.type || typeof transaction.type !== 'string') {
        throw new Error('SECURITY: Invalid transaction type');
      }

      const amount = parseFloat(transaction.amount);
      if (!Number.isFinite(amount) || amount === null || amount === undefined) {
        throw new Error('SECURITY: Invalid transaction amount - must be finite number');
      }

      if (amount <= 0) {
        throw new Error('SECURITY: Invalid transaction amount - must be positive');
      }

      if (amount > 1000000) {
        throw new Error('SECURITY: Transaction amount exceeds maximum allowed (1M)');
      }

      // Validar balances se fornecidos
      if (transaction.balanceBefore !== undefined) {
        const balanceBefore = parseFloat(transaction.balanceBefore);
        if (!Number.isFinite(balanceBefore)) {
          throw new Error('SECURITY: Invalid balance before - must be finite number');
        }
      }

      if (transaction.balanceAfter !== undefined) {
        const balanceAfter = parseFloat(transaction.balanceAfter);
        if (!Number.isFinite(balanceAfter)) {
          throw new Error('SECURITY: Invalid balance after - must be finite number');
        }
      }

      // VALIDAÇÃO RIGOROSA DE TIMESTAMP (proteção contra manipulação de timestamp)
      if ('createdAt' in transaction) {
        if (transaction.createdAt === null) {
          throw new Error('SECURITY: Null timestamp not allowed');
        }
        if (transaction.createdAt === undefined) {
          throw new Error('SECURITY: Undefined timestamp not allowed');
        }
        const now = new Date();
        let transactionDate;

        try {
          transactionDate = new Date(transaction.createdAt);
        } catch (error) {
          throw new Error('SECURITY: Invalid transaction date format');
        }

        if (isNaN(transactionDate.getTime())) {
          throw new Error('SECURITY: Invalid transaction date format');
        }

        // Não permitir timestamps no futuro (tolerância de 5 minutos)
        if (transactionDate.getTime() > now.getTime() + (5 * 60 * 1000)) {
          throw new Error('SECURITY: Transaction date cannot be in the future');
        }

        // Não permitir timestamps muito antigos (mais de 30 dias)
        if (transactionDate.getTime() < now.getTime() - (30 * 24 * 60 * 60 * 1000)) {
          throw new Error('SECURITY: Transaction date too old (max 30 days)');
        }

        // Rejeitar timestamps extremos
        const year = transactionDate.getFullYear();
        if (year < 2020 || year > 2030) {
          throw new Error('SECURITY: Transaction date year out of valid range');
        }
      }

      // Verificar integridade referencial
      const user = await this.getUser(transaction.userId);
      if (!user) {
        throw new Error('SECURITY: User not found - cannot create transaction');
      }

      const transactionData = {
        userId: transaction.userId,
        type: transaction.type,
        amount: amount.toFixed(2),
        balanceBefore: transaction.balanceBefore?.toString() || '0',
        balanceAfter: transaction.balanceAfter?.toString() || '0',
        description: transaction.description || null,
        paymentMethod: transaction.paymentMethod || null,
        gameSessionId: transaction.gameSessionId || null
      };

      const result = await db.insert(transactions).values(transactionData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<any> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) return null;

      const result = await db.select().from(transactions).where(eq(transactions.id, numericId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  async getTransactionByExternalId(externalId: string): Promise<any> {
    try {
      // Search by external_txn_id (secure, generated by payment gateways)
      const result = await db.select().from(transactions).where(eq(transactions.externalTxnId, externalId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting transaction by external ID:', error);
      return null;
    }
  }

  async getTransactionByReferenceCode(referenceCode: string): Promise<any> {
    try {
      // Search by order_number (used for both Plisio and Primepag)
      const result = await db.select().from(transactions).where(eq(transactions.orderNumber, referenceCode)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting transaction by reference code:', error);
      return null;
    }
  }

  async updateTransaction(id: string, updates: any): Promise<void> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid transaction ID:', id);
        return;
      }

      // Clean the updates object and handle metadata specially
      const cleanUpdates: any = {};

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null && key !== '') {
          if (key === 'metadata') {
            // Ensure metadata is properly stringified JSON
            cleanUpdates[key] = typeof value === 'string' ? value : JSON.stringify(value);
          } else {
            cleanUpdates[key] = value;
          }
        }
      }

      if (Object.keys(cleanUpdates).length === 0) {
        console.error('No valid updates provided');
        return;
      }

      console.log('Updating transaction:', numericId, 'with data:', cleanUpdates);

      await db.update(transactions)
        .set(cleanUpdates)
        .where(eq(transactions.id, numericId));

      console.log('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('Failed to update transaction');
    }
  }

  async getUserTransactions(userId: number): Promise<any[]> {
    try {
      const result = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, userId));

      return result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  async getSiteSettings(): Promise<any> {
    try {
      const result = await db.select().from(siteSettings).limit(1);

      if (result.length === 0) {
        // Create default settings if none exist
        const defaultSettings = {
          siteName: 'Memória Premiada',
          favicon: null,
          logoLight: null,
          logoDark: null,
          primaryColor: '#6366f1',
          theme: 'light'
        };

        const inserted = await db.insert(siteSettings).values(defaultSettings).returning();
        return inserted[0];
      }

      return result[0];
    } catch (error) {
      console.error('Error getting site settings:', error);
      throw new Error('Failed to get site settings');
    }
  }

  async updateSiteSettings(settings: any): Promise<void> {
    try {
      const existing = await this.getSiteSettings();

      if (existing.id) {
        await db.update(siteSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(siteSettings.id, existing.id));
      } else {
        await db.insert(siteSettings).values({
          ...settings,
          updatedAt: new Date()
        });
      }

      console.log('Site settings updated in database:', settings);
    } catch (error) {
      console.error('Error updating site settings:', error);
      throw new Error('Failed to update site settings');
    }
  }

  // Métodos de afiliados
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by referral code:', error);
      return undefined;
    }
  }

  async updateUserReferralInfo(userId: number, referredBy: string): Promise<void> {
    try {
      await db.update(users)
        .set({ referredBy, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user referral info:', error);
      throw new Error('Failed to update referral info');
    }
  }

  async createReferralCommission(commission: any): Promise<ReferralCommission> {
    try {
      const result = await db.insert(referralCommissions).values(commission).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating referral commission:', error);
      throw new Error('Failed to create referral commission');
    }
  }

  async getReferralStats(userId: number): Promise<any> {
    try {
      // Contar total de indicados
      const userCode = await db.select({ code: users.referralCode })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userCode[0]?.code) {
        return { totalReferrals: 0, totalCommissions: 0, pendingCommissions: 0 };
      }

      const referralsCount = await db.select({ count: count() })
        .from(users)
        .where(eq(users.referredBy, userCode[0].code));

      // Somar total de comissões
      const commissionSum = await db.select({ 
        total: sum(referralCommissions.commissionAmount),
        pending: count()
      })
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, userId));

      return {
        totalReferrals: referralsCount[0]?.count || 0,
        totalCommissions: parseFloat(commissionSum[0]?.total || '0'),
        pendingCommissions: commissionSum[0]?.pending || 0
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return { totalReferrals: 0, totalCommissions: 0, pendingCommissions: 0 };
    }
  }

  async getUserReferrals(userId: number): Promise<User[]> {
    try {
      const userCode = await db.select({ code: users.referralCode })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userCode[0]?.code) return [];

      const result = await db.select()
        .from(users)
        .where(eq(users.referredBy, userCode[0].code));

      return result;
    } catch (error) {
      console.error('Error getting user referrals:', error);
      return [];
    }
  }

  async getReferralCommissions(userId: number): Promise<ReferralCommission[]> {
    try {
      const result = await db.select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, userId));

      return result;
    } catch (error) {
      console.error('Error getting referral commissions:', error);
      return [];
    }
  }

  async generateUniqueReferralCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate 12 unique characters (letters and numbers)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomChars = '';
      for (let i = 0; i < 12; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = 'MEMO' + randomChars;

      try {
        const existing = await this.getUserByReferralCode(code);
        if (!existing) {
          return code;
        }
      } catch (error) {
        console.error('Error checking referral code uniqueness:', error);
      }

      attempts++;
    }

    throw new Error('Failed to generate unique referral code');
  }

  // Password reset methods
  async createPasswordReset(data: { userId: number; token: string; expiresAt: Date }): Promise<PasswordReset> {
    try {
      const result = await db.insert(passwordResets).values({
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        used: false
      }).returning();
      return result[0];
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      throw new Error('Failed to create password reset');
    }
  }

  async getPasswordReset(token: string): Promise<PasswordReset | undefined> {
    try {
      const result = await db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      return undefined;
    }
  }

  async markPasswordResetUsed(token: string): Promise<void> {
    try {
      await db.update(passwordResets)
        .set({ used: true })
        .where(eq(passwordResets.token, token));
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      throw new Error('Failed to mark password reset as used');
    }
  }

  // Métodos de token de usuário
  async getUserByToken(userToken: string): Promise<User | undefined> {
    try {
      if (!isValidUserToken(userToken)) {
        return undefined;
      }

      const result = await db.select().from(users).where(eq(users.userToken, userToken)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      return undefined;
    }
  }

  async checkUserTokenExists(userToken: string): Promise<boolean> {
    try {
      const result = await db.select({ id: users.id }).from(users).where(eq(users.userToken, userToken)).limit(1);
      return result.length > 0;
    } catch (error) {
      LogSanitizer.logError("Authentication error", new Error("Operation failed"));
      return false;
    }
  }

  async getAffiliateSettings(): Promise<AffiliateSettings> {
    try {
      if (this.affiliateSettings) {
        return this.affiliateSettings;
      }

      const result = await db.select().from(affiliateSettings).limit(1);
      if (result.length > 0) {
        this.affiliateSettings = result[0];
        return result[0];
      }

      // Criar configurações padrão se não existir
      const defaultSettings = {
        referrerBonus: "1.00",
        referredBonus: "1.00", 
        commissionPercentage: "5.00",
        minWithdrawal: "10.00",
        isActive: true
      };

      const newSettings = await db.insert(affiliateSettings).values(defaultSettings).returning();
      this.affiliateSettings = newSettings[0];
      return newSettings[0];
    } catch (error) {
      console.error('Error getting affiliate settings:', error);
      // Retornar configurações padrão em caso de erro
      return {
        id: 1,
        referrerBonus: "1.00",
        referredBonus: "1.00",
        commissionPercentage: "5.00", 
        minWithdrawal: "10.00",
        isActive: true,
        updatedAt: new Date()
      };
    }
  }

  async updateAffiliateSettings(settings: Partial<AffiliateSettings>): Promise<void> {
    try {
      const currentSettings = await this.getAffiliateSettings();
      await db.update(affiliateSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(affiliateSettings.id, currentSettings.id));

      // Atualizar cache
      this.affiliateSettings = null;
    } catch (error) {
      console.error('Error updating affiliate settings:', error);
      throw new Error('Failed to update affiliate settings');
    }
  }

  async getPaymentSettings(provider: string): Promise<any> {
    try {
      const result = await db.select()
        .from(paymentSettings)
        .where(eq(paymentSettings.provider, provider))
        .limit(1);

      if (result.length === 0) {
        // Create default settings for provider if not exists
        const defaultSettings = {
          provider,
          isTestMode: true,
          clientId: provider === 'primepag' ? '98e38184-8d95-4be1-97bb-abe5b8f8d886' : '',
          clientSecret: provider === 'primepag' ? 'ad35160d-4e84-4371-a190-c442588fe2e4' : '',
          secretKey: '',
          isActive: true,
          minDepositAmount: '10.00',
          maxDepositAmount: provider === 'primepag' ? '50000.00' : '100000.00',
          minWithdrawalAmount: "10.00",
          maxWithdrawalAmount: provider === 'primepag' ? '50000.00' : '100000.00',
          withdrawalFeePercentage: provider === 'primepag' ? '2.50' : '1.00'
        };

        const created = await db.insert(paymentSettings)
          .values(defaultSettings)
          .returning();

        return created[0];
      }

      return result[0];
    } catch (error) {
      console.error('Error getting payment settings:', error);
      throw new Error('Failed to get payment settings');
    }
  }

  async updatePaymentSettings(provider: string, settings: any): Promise<void> {
    try {
      const existing = await this.getPaymentSettings(provider);

      await db.update(paymentSettings)
        .set({ 
          ...settings, 
          updatedAt: new Date() 
        })
        .where(eq(paymentSettings.id, existing.id));

      console.log(`[STORAGE] Updated payment settings for ${provider}`);
    } catch (error) {
      console.error('Error updating payment settings:', error);
      throw new Error('Failed to update payment settings');
    }
  }

  async calculateWithdrawableBalance(userId: number): Promise<{ withdrawable: number; total: number; bonus: number; earnings: number; totalWithdrawn: number }> {
    // PROTEÇÃO CONTRA RACE CONDITIONS - Usar mutex/lock para operações críticas
    const existingLock = this.balanceCalculationLocks.get(userId);
    if (existingLock) {
      return existingLock;
    }

    const calculationPromise = this._performBalanceCalculation(userId);
    this.balanceCalculationLocks.set(userId, calculationPromise);

    try {
      const result = await calculationPromise;
      return result;
    } finally {
      // Remover lock após completar
      this.balanceCalculationLocks.delete(userId);
    }
  }

  private async _performBalanceCalculation(userId: number): Promise<{ withdrawable: number; total: number; bonus: number; earnings: number; totalWithdrawn: number }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const totalBalance = parseFloat(user.balance?.toString() || '0');
      const bonusBalance = parseFloat(user.bonusBalance?.toString() || '0');
      const totalEarnings = parseFloat(user.totalEarnings?.toString() || '0');
      const totalWithdrawn = parseFloat(user.totalWithdrawals?.toString() || '0');

      // VALIDAÇÃO CRÍTICA: Verificar se todos os valores são números válidos
      const values = [totalBalance, bonusBalance, totalEarnings, totalWithdrawn];
      for (const value of values) {
        if (!Number.isFinite(value)) {
          console.error(`[SECURITY] Invalid balance data for user ${userId}:`, {
            totalBalance, bonusBalance, totalEarnings, totalWithdrawn
          });
          throw new Error('SECURITY: Invalid balance data detected');
        }
      }

      // Saldo sacável = Ganhos reais - Saques já realizados
      // Bônus não conta como saldo sacável
      const withdrawableBalance = Math.max(0, totalEarnings - totalWithdrawn);

      LogSanitizer.logFinancial('Balance calculation completed', userId);

      return {
        withdrawable: withdrawableBalance,
        total: totalBalance,
        bonus: bonusBalance,
        earnings: totalEarnings,
        totalWithdrawn: totalWithdrawn
      };
    } catch (error) {
      console.error('Error calculating withdrawable balance:', error);
      throw error;
    }
  }

  async updateUserEarnings(userId: number, earningsAmount: number): Promise<void> {
    try {
      // VALIDAÇÃO DE SEGURANÇA: Verificar inputs maliciosos
      if (!Number.isFinite(earningsAmount) || earningsAmount === null || earningsAmount === undefined) {
        throw new Error('Invalid earnings amount: must be a finite number');
      }

      if (earningsAmount < 0) {
        throw new Error('Invalid earnings amount: cannot be negative');
      }

      if (earningsAmount > 1000000) {
        throw new Error('Invalid earnings amount: exceeds maximum allowed');
      }

      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentEarnings = parseFloat(user.totalEarnings?.toString() || '0');

      // Validar que currentEarnings é um número válido
      if (!Number.isFinite(currentEarnings)) {
        console.warn(`[SECURITY] Resetting corrupted earnings for user ${userId}`);
        await db.update(users)
          .set({ totalEarnings: '0.00' })
          .where(eq(users.id, userId));
        const newTotalEarnings = earningsAmount;

        await db.update(users)
          .set({ 
            totalEarnings: newTotalEarnings.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        LogSanitizer.logFinancial('User earnings reset and updated', userId);
        return;
      }

      const newTotalEarnings = currentEarnings + earningsAmount;

      // Validação final do resultado
      if (!Number.isFinite(newTotalEarnings)) {
        throw new Error('Operation would result in invalid earnings value');
      }

      await db.update(users)
        .set({ 
          totalEarnings: newTotalEarnings.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      LogSanitizer.logFinancial('User earnings updated', userId);
    } catch (error) {
      console.error('Error updating user earnings:', error);
      throw error;
    }
  }

  async updateUserBonusBalance(userId: number, bonusAmount: number): Promise<void> {
    try {
      // VALIDAÇÃO DE SEGURANÇA: Verificar inputs maliciosos
      if (!Number.isFinite(bonusAmount) || bonusAmount === null || bonusAmount === undefined) {
        throw new Error('Invalid bonus amount: must be a finite number');
      }

      if (bonusAmount < 0) {
        throw new Error('Invalid bonus amount: cannot be negative');
      }

      if (bonusAmount > 1000000) {
        throw new Error('Invalid bonus amount: exceeds maximum allowed');
      }

      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentBonus = parseFloat(user.bonusBalance?.toString() || '0');

      // Validar que currentBonus é um número válido
      if (!Number.isFinite(currentBonus)) {
        console.warn(`[SECURITY] Resetting corrupted bonus balance for user ${userId}`);
        await db.update(users)
          .set({ bonusBalance: '0.00' })
          .where(eq(users.id, userId));
        const newBonusBalance = bonusAmount;

        await db.update(users)
          .set({ 
            bonusBalance: newBonusBalance.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        LogSanitizer.logFinancial('User bonus balance reset and updated', userId);
        return;
      }

      const newBonusBalance = currentBonus + bonusAmount;

      // Validação final do resultado
      if (!Number.isFinite(newBonusBalance)) {
        throw new Error('Operation would result in invalid bonus balance value');
      }

      await db.update(users)
        .set({ 
          bonusBalance: newBonusBalance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      LogSanitizer.logFinancial('User bonus balance updated', userId);
    } catch (error) {
      console.error('Error updating user bonus balance:', error);
      throw error;
    }
  }

  async recordWithdrawalAmount(userId: number, withdrawalAmount: number): Promise<void> {
    try {
      // VALIDAÇÃO DE SEGURANÇA: Verificar inputs maliciosos
      if (!Number.isFinite(withdrawalAmount) || withdrawalAmount === null || withdrawalAmount === undefined) {
        throw new Error('Invalid withdrawal amount: must be a finite number');
      }

      if (withdrawalAmount <= 0) {
        throw new Error('Invalid withdrawal amount: must be positive');
      }

      if (withdrawalAmount > 1000000) {
        throw new Error('Invalid withdrawal amount: exceeds maximum allowed');
      }

      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentWithdrawals = parseFloat(user.totalWithdrawals?.toString() || '0');

      // Validar que currentWithdrawals é um número válido
      if (!Number.isFinite(currentWithdrawals)) {
        console.warn(`[SECURITY] Resetting corrupted total withdrawals for user ${userId}`);
        await db.update(users)
          .set({ totalWithdrawals: '0.00' })
          .where(eq(users.id, userId));
        const newTotalWithdrawals = withdrawalAmount;

        await db.update(users)
          .set({ 
            totalWithdrawals: newTotalWithdrawals.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        LogSanitizer.logFinancial('User total withdrawals reset and updated', userId);
        return;
      }

      const newTotalWithdrawals = currentWithdrawals + withdrawalAmount;

      // Validação final do resultado
      if (!Number.isFinite(newTotalWithdrawals)) {
        throw new Error('Operation would result in invalid total withdrawals value');
      }

      await db.update(users)
        .set({ 
          totalWithdrawals: newTotalWithdrawals.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      LogSanitizer.logFinancial('User total withdrawals updated', userId);
    } catch (error) {
      console.error('Error recording withdrawal amount:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();