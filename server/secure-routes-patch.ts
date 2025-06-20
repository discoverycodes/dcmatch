/**
 * Security patches for critical vulnerabilities
 * Replaces client-side trust with server-side validation
 */

import { Express } from 'express';
import { storage } from './database-storage';
import { financialValidator } from './financial-validator';
import { gameValidator } from './game-state-validator';
import { LogSanitizer } from './log-sanitizer';
import { z } from 'zod';

// Secure schemas that don't trust client values
const secureGameStartSchema = z.object({
  // Remove betAmount from client - server determines it
});

const secureGameResultSchema = z.object({
  sessionId: z.string(),
  // Remove won/matchedPairs - server calculates based on actual gameplay
});

const secureDepositSchema = z.object({
  // Remove amount - server uses predefined amounts
  paymentMethod: z.enum(['pix', 'crypto'])
});

const secureWithdrawalSchema = z.object({
  pixKey: z.string(),
  // Remove amount - server calculates max withdrawable
});

export function applySecurityPatches(app: Express) {
  
  // PATCH 1: Secure game session creation
  app.post("/api/game/secure/create-session", async (req, res) => {
    try {
      const userId = parseInt((req as any).session?.userId);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Server determines bet amount based on user settings/tier
      const gameSettings = await storage.getGameSettings();
      const userDefaultBet = gameSettings?.defaultBet || 10;
      
      // Validate user can afford the bet
      const validation = await financialValidator.validateBetAmount(userId, userDefaultBet);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const betAmount = validation.sanitizedValue!;
      
      // Initialize secure game state on server
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const gameInit = gameValidator.initializeGame(sessionId, userId);
      
      if (!gameInit.success) {
        return res.status(500).json({ error: "Failed to initialize game" });
      }

      // Create database session
      const session = await storage.createGameSession({
        sessionId,
        userId,
        betAmount,
        status: 'active',
        createdAt: new Date(),
      });

      // Deduct bet immediately from user balance
      const user = await storage.getUser(userId);
      const newBalance = parseFloat(String(user?.balance || 0)) - betAmount;
      await storage.updateUserBalance(userId, newBalance);

      LogSanitizer.logFinancial('Secure game session created', userId, betAmount);

      res.json({
        success: true,
        sessionId,
        betAmount,
        newBalance: newBalance.toFixed(2)
      });

    } catch (error) {
      LogSanitizer.logError('Secure game creation failed', error as Error);
      res.status(500).json({ error: "Failed to create game session" });
    }
  });

  // PATCH 2: Secure card flip processing
  app.post("/api/game/secure/flip-card", async (req, res) => {
    try {
      const { sessionId, cardIndex } = req.body;
      const userId = parseInt((req as any).session?.userId);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate session
      const sessionValidation = await financialValidator.validateSessionIntegrity(sessionId, userId);
      if (!sessionValidation.valid) {
        return res.status(400).json({ error: sessionValidation.error });
      }

      // Process card flip on server
      const result = gameValidator.processCardFlip(sessionId, parseInt(cardIndex), userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        cardValue: result.cardValue,
        isMatch: result.isMatch,
        gameComplete: result.gameComplete
      });

    } catch (error) {
      LogSanitizer.logError('Card flip processing failed', error as Error);
      res.status(500).json({ error: "Failed to process card flip" });
    }
  });

  // PATCH 3: Secure game result processing
  app.post("/api/game/secure/complete", async (req, res) => {
    try {
      const { sessionId } = secureGameResultSchema.parse(req.body);
      const userId = parseInt((req as any).session?.userId);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate final game state on server
      const validation = gameValidator.validateGameResult(sessionId, userId, true, 8);
      
      if (!validation.valid) {
        LogSanitizer.logAuth(`Game manipulation attempt: ${validation.error}`, `user_${userId}`);
        return res.status(400).json({ error: "Invalid game state" });
      }

      // Server calculates actual winnings
      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const winnings = financialValidator.calculateGameWinnings(
        session.betAmount,
        validation.actualPairs,
        validation.playTime,
        validation.actualWon
      );

      // Update session with server-validated results
      await storage.updateGameSession(sessionId, {
        status: 'completed',
        result: validation.actualWon ? 'won' : 'lost',
        winAmount: winnings,
        matchedPairs: validation.actualPairs,
        completedAt: new Date(),
      });

      // Award winnings if game was won
      if (validation.actualWon && winnings > 0) {
        const user = await storage.getUser(userId);
        const newBalance = parseFloat(String(user?.balance || 0)) + winnings;
        await storage.updateUserBalance(userId, newBalance);
        await storage.updateUserEarnings(userId, winnings);
      }

      LogSanitizer.logFinancial('Game completed securely', userId, winnings);

      res.json({
        success: true,
        won: validation.actualWon,
        winnings: winnings,
        actualPairs: validation.actualPairs,
        moves: validation.moves,
        playTime: validation.playTime
      });

    } catch (error) {
      LogSanitizer.logError('Secure game completion failed', error as Error);
      res.status(500).json({ error: "Failed to complete game" });
    }
  });

  // PATCH 4: Secure deposit with predefined amounts
  app.post("/api/payments/secure/deposit", async (req, res) => {
    try {
      const { paymentMethod, amountTier } = req.body;
      const userId = parseInt((req as any).session?.userId);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Server defines allowed deposit amounts (not client)
      const allowedAmounts = [10, 25, 50, 100, 250, 500, 1000];
      const selectedAmount = allowedAmounts[parseInt(amountTier) || 0];

      if (!selectedAmount) {
        return res.status(400).json({ error: "Invalid deposit tier" });
      }

      // Validate deposit with server-controlled amount
      const validation = await financialValidator.validateDepositAmount(userId, selectedAmount, paymentMethod);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Continue with secure payment processing...
      res.json({
        success: true,
        amount: validation.sanitizedValue,
        message: "Secure deposit initiated"
      });

    } catch (error) {
      LogSanitizer.logError('Secure deposit failed', error as Error);
      res.status(500).json({ error: "Failed to process deposit" });
    }
  });

  // PATCH 5: Secure withdrawal with server-calculated amounts
  app.post("/api/payments/secure/withdraw", async (req, res) => {
    try {
      const { pixKey, withdrawalType } = req.body;
      const userId = parseInt((req as any).session?.userId);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate PIX key format
      const pixValidation = financialValidator.validatePixKey(pixKey);
      if (!pixValidation.valid) {
        return res.status(400).json({ error: pixValidation.error });
      }

      // Server calculates withdrawable amount
      const balanceInfo = await storage.calculateWithdrawableBalance(userId);
      
      let withdrawalAmount: number;
      switch (withdrawalType) {
        case 'partial':
          withdrawalAmount = Math.floor(balanceInfo.withdrawable * 0.5); // 50%
          break;
        case 'full':
          withdrawalAmount = balanceInfo.withdrawable;
          break;
        default:
          return res.status(400).json({ error: "Invalid withdrawal type" });
      }

      if (withdrawalAmount <= 0) {
        return res.status(400).json({ error: "No withdrawable balance" });
      }

      // Validate server-calculated amount
      const validation = await financialValidator.validateWithdrawalAmount(userId, withdrawalAmount);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Continue with secure withdrawal processing...
      res.json({
        success: true,
        amount: validation.sanitizedValue,
        balanceInfo: validation.details,
        message: "Secure withdrawal initiated"
      });

    } catch (error) {
      LogSanitizer.logError('Secure withdrawal failed', error as Error);
      res.status(500).json({ error: "Failed to process withdrawal" });
    }
  });

  // PATCH 6: Security monitoring endpoint
  app.get("/api/admin/security/violations", async (req, res) => {
    try {
      const adminUserId = (req as any).session?.userId;
      
      // Validate admin access
      if (!adminUserId || adminUserId !== "admin") {
        LogSanitizer.logAuth('Unauthorized admin access attempt', adminUserId || 'unknown');
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get security violations from transactions
      const violations = await storage.getUserTransactions(0); // Get all security violations
      const securityViolations = violations.filter(t => t.type === 'security_violation');

      res.json({
        success: true,
        violations: securityViolations.map(v => ({
          id: v.id,
          userId: v.userId,
          description: v.description,
          createdAt: v.createdAt,
          metadata: v.metadata
        }))
      });

    } catch (error) {
      LogSanitizer.logError('Security violations fetch failed', error as Error);
      res.status(500).json({ error: "Failed to fetch violations" });
    }
  });
}

// Session security middleware
export function secureSessionMiddleware(req: any, res: any, next: any) {
  const session = req.session;
  
  if (session && session.userId) {
    // Regenerate session ID periodically for security
    const lastRegeneration = session.lastRegeneration || 0;
    const now = Date.now();
    
    if (now - lastRegeneration > 30 * 60 * 1000) { // 30 minutes
      session.regenerate((err: any) => {
        if (err) {
          LogSanitizer.logError('Session regeneration failed', err);
        } else {
          session.lastRegeneration = now;
          LogSanitizer.logAuth('Session regenerated for security', `user_${session.userId}`);
        }
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
}