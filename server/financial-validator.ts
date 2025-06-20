/**
 * Financial Operations Validator
 * Validates ALL financial operations server-side to prevent client manipulation
 */

import { storage } from './database-storage';
import { LogSanitizer } from './log-sanitizer';

interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: number;
  details?: any;
}

class FinancialValidator {
  
  /**
   * Validate and sanitize bet amount - NEVER trust client
   */
  async validateBetAmount(userId: number, clientBetAmount: any): Promise<ValidationResult> {
    try {
      // Get game settings from database (server truth)
      const gameSettings = await storage.getGameSettings();
      const minBet = gameSettings?.minBet || 1;
      const maxBet = gameSettings?.maxBet || 100;
      
      // Validate type and convert
      const betAmount = parseFloat(String(clientBetAmount));
      
      if (!Number.isFinite(betAmount) || isNaN(betAmount)) {
        LogSanitizer.logAuth('Invalid bet amount attempted', `user_${userId}`);
        return { valid: false, error: 'Invalid bet amount format' };
      }
      
      if (betAmount <= 0) {
        return { valid: false, error: 'Bet amount must be positive' };
      }
      
      if (betAmount < minBet) {
        return { valid: false, error: `Minimum bet is R$ ${minBet.toFixed(2)}` };
      }
      
      if (betAmount > maxBet) {
        return { valid: false, error: `Maximum bet is R$ ${maxBet.toFixed(2)}` };
      }
      
      // Check user balance
      const user = await storage.getUser(userId);
      if (!user) {
        return { valid: false, error: 'User not found' };
      }
      
      const userBalance = parseFloat(String(user.balance || 0));
      if (userBalance < betAmount) {
        return { valid: false, error: 'Insufficient balance' };
      }
      
      return { 
        valid: true, 
        sanitizedValue: Number(betAmount.toFixed(2))
      };
      
    } catch (error) {
      LogSanitizer.logError('Bet validation error', error as Error);
      return { valid: false, error: 'Validation failed' };
    }
  }
  
  /**
   * Validate deposit amount - server determines allowed amounts
   */
  async validateDepositAmount(userId: number, clientAmount: any, paymentMethod: string): Promise<ValidationResult> {
    try {
      // Get payment method limits from database
      const paymentSettings = await storage.getPaymentSettings(paymentMethod.toLowerCase());
      const minDeposit = paymentSettings?.minDepositAmount || 10;
      const maxDeposit = paymentSettings?.maxDepositAmount || 10000;
      
      const amount = parseFloat(String(clientAmount));
      
      if (!Number.isFinite(amount) || isNaN(amount)) {
        LogSanitizer.logAuth('Invalid deposit amount attempted', `user_${userId}`);
        return { valid: false, error: 'Invalid deposit amount format' };
      }
      
      if (amount <= 0) {
        return { valid: false, error: 'Deposit amount must be positive' };
      }
      
      if (amount < minDeposit) {
        return { valid: false, error: `Minimum deposit is R$ ${minDeposit.toFixed(2)}` };
      }
      
      if (amount > maxDeposit) {
        return { valid: false, error: `Maximum deposit is R$ ${maxDeposit.toFixed(2)}` };
      }
      
      // Check for suspicious patterns
      if (await this.isDepositSuspicious(userId, amount)) {
        LogSanitizer.logAuth('Suspicious deposit pattern detected', `user_${userId}`);
        return { valid: false, error: 'Deposit flagged for review' };
      }
      
      return { 
        valid: true, 
        sanitizedValue: Number(amount.toFixed(2))
      };
      
    } catch (error) {
      LogSanitizer.logError('Deposit validation error', error as Error);
      return { valid: false, error: 'Validation failed' };
    }
  }
  
  /**
   * Validate withdrawal amount - most critical validation
   */
  async validateWithdrawalAmount(userId: number, clientAmount: any): Promise<ValidationResult> {
    try {
      const amount = parseFloat(String(clientAmount));
      
      if (!Number.isFinite(amount) || isNaN(amount)) {
        LogSanitizer.logAuth('Invalid withdrawal amount attempted', `user_${userId}`);
        return { valid: false, error: 'Invalid withdrawal amount format' };
      }
      
      if (amount <= 0) {
        return { valid: false, error: 'Withdrawal amount must be positive' };
      }
      
      // Get REAL withdrawable balance from server calculation
      const balanceInfo = await storage.calculateWithdrawableBalance(userId);
      
      if (amount > balanceInfo.withdrawable) {
        LogSanitizer.logFinancial('Withdrawal attempt exceeds balance', userId, amount);
        return { 
          valid: false, 
          error: 'Insufficient withdrawable balance',
          details: {
            requested: amount,
            available: balanceInfo.withdrawable,
            total: balanceInfo.total,
            earnings: balanceInfo.earnings,
            withdrawn: balanceInfo.totalWithdrawn
          }
        };
      }
      
      // Get withdrawal limits
      const withdrawalSettings = await storage.getPaymentSettings('withdrawal');
      const minWithdrawal = withdrawalSettings?.minWithdrawalAmount || 10;
      const maxWithdrawal = withdrawalSettings?.maxWithdrawalAmount || 50000;
      
      if (amount < minWithdrawal) {
        return { valid: false, error: `Minimum withdrawal is R$ ${minWithdrawal.toFixed(2)}` };
      }
      
      if (amount > maxWithdrawal) {
        return { valid: false, error: `Maximum withdrawal is R$ ${maxWithdrawal.toFixed(2)}` };
      }
      
      // Check daily withdrawal limits
      const dailyWithdrawn = await this.getDailyWithdrawnAmount(userId);
      const dailyLimit = withdrawalSettings?.dailyWithdrawalLimit || 1000;
      
      if (dailyWithdrawn + amount > dailyLimit) {
        return { 
          valid: false, 
          error: `Daily withdrawal limit exceeded. Remaining: R$ ${(dailyLimit - dailyWithdrawn).toFixed(2)}`
        };
      }
      
      return { 
        valid: true, 
        sanitizedValue: Number(amount.toFixed(2)),
        details: balanceInfo
      };
      
    } catch (error) {
      LogSanitizer.logError('Withdrawal validation error', error as Error);
      return { valid: false, error: 'Validation failed' };
    }
  }
  
  /**
   * Validate game winnings calculation - server-side only
   */
  calculateGameWinnings(betAmount: number, matchedPairs: number, gameTime: number, isWin: boolean): number {
    if (!isWin || matchedPairs !== 8) {
      return 0;
    }
    
    // Base multiplier from game settings
    const baseMultiplier = 2; // Will be fetched from settings
    let winnings = betAmount * baseMultiplier;
    
    // Time bonus (faster = better)
    if (gameTime < 60) { // Less than 1 minute
      winnings += betAmount * 0.5; // 50% bonus
    } else if (gameTime < 120) { // Less than 2 minutes
      winnings += betAmount * 0.25; // 25% bonus
    }
    
    // Ensure winnings don't exceed maximum
    const maxWinnings = betAmount * 5; // 5x max
    return Math.min(winnings, maxWinnings);
  }
  
  /**
   * Validate session integrity
   */
  async validateSessionIntegrity(sessionId: string, userId: number): Promise<ValidationResult> {
    try {
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return { valid: false, error: 'Session not found' };
      }
      
      if (session.userId !== userId) {
        LogSanitizer.logAuth('Session access violation', `user_${userId}`);
        return { valid: false, error: 'Unauthorized session access' };
      }
      
      if (session.status !== 'active') {
        return { valid: false, error: 'Session not active' };
      }
      
      // Check if session was already used for a result
      if (session.result) {
        LogSanitizer.logAuth('Session reuse attempt', `user_${userId}`);
        return { valid: false, error: 'Session already completed' };
      }
      
      // Check session age
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      if (sessionAge > maxAge) {
        await storage.updateGameSession(sessionId, { status: 'expired' });
        return { valid: false, error: 'Session expired' };
      }
      
      return { valid: true };
      
    } catch (error) {
      LogSanitizer.logError('Session validation error', error as Error);
      return { valid: false, error: 'Session validation failed' };
    }
  }
  
  /**
   * Check for suspicious deposit patterns
   */
  private async isDepositSuspicious(userId: number, amount: number): Promise<boolean> {
    try {
      // Get recent deposits
      const recentDeposits = await storage.getUserTransactions(userId);
      const last24h = recentDeposits.filter(t => 
        t.type === 'deposit' && 
        new Date(t.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );
      
      // Flag if more than 10 deposits in 24h
      if (last24h.length > 10) {
        return true;
      }
      
      // Flag if amount is much larger than historical average
      const avgDeposit = last24h.length > 0 
        ? last24h.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0) / last24h.length
        : 0;
      
      if (avgDeposit > 0 && amount > avgDeposit * 10) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get daily withdrawn amount for limits
   */
  private async getDailyWithdrawnAmount(userId: number): Promise<number> {
    try {
      const transactions = await storage.getUserTransactions(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayWithdrawals = transactions.filter(t => 
        t.type === 'withdrawal' && 
        t.status === 'completed' &&
        new Date(t.createdAt).getTime() >= today.getTime()
      );
      
      return todayWithdrawals.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Validate PIX key format
   */
  validatePixKey(pixKey: string): ValidationResult {
    const cleanKey = String(pixKey).trim();
    
    if (!cleanKey) {
      return { valid: false, error: 'PIX key is required' };
    }
    
    // CPF format: 000.000.000-00 or 00000000000
    const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
    
    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Phone format: +5511999999999
    const phoneRegex = /^\+55\d{2}9?\d{8}$/;
    
    // Random key: 36 characters
    const randomKeyRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    
    if (cpfRegex.test(cleanKey) || emailRegex.test(cleanKey) || 
        phoneRegex.test(cleanKey) || randomKeyRegex.test(cleanKey)) {
      return { valid: true, sanitizedValue: 0, details: { pixKey: cleanKey } };
    }
    
    return { valid: false, error: 'Invalid PIX key format' };
  }
}

// Singleton instance
export const financialValidator = new FinancialValidator();