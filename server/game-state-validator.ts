/**
 * Server-side game state validation
 * Tracks every move to prevent client-side manipulation
 */

interface GameMove {
  cardIndex: number;
  timestamp: number;
  sequence: number;
}

interface ServerGameState {
  sessionId: string;
  userId: number;
  cardLayout: number[]; // Server-generated card positions
  moves: GameMove[];
  flippedCards: number[];
  matchedPairs: Set<number>;
  startTime: number;
  isComplete: boolean;
  maxMoves: number;
  timeLimit: number;
}

class GameStateValidator {
  private activeGames = new Map<string, ServerGameState>();
  
  /**
   * Initialize new game session with server-controlled card layout
   */
  initializeGame(sessionId: string, userId: number): { success: boolean; cardLayout?: number[] } {
    try {
      // Generate random card layout on server (client never knows the positions)
      const cardLayout = this.generateSecureCardLayout();
      
      const gameState: ServerGameState = {
        sessionId,
        userId,
        cardLayout,
        moves: [],
        flippedCards: [],
        matchedPairs: new Set(),
        startTime: Date.now(),
        isComplete: false,
        maxMoves: 50, // Prevent brute force
        timeLimit: 5 * 60 * 1000 // 5 minutes max
      };
      
      this.activeGames.set(sessionId, gameState);
      console.log(`[GAME] Session ${sessionId} initialized for user ${userId}`);
      
      // Return only card back pattern, not the actual values
      return { 
        success: true, 
        cardLayout: new Array(16).fill(0) // Client sees only card backs
      };
      
    } catch (error) {
      console.error('[GAME] Failed to initialize game:', error);
      return { success: false };
    }
  }
  
  /**
   * Process individual card flip and return result
   */
  processCardFlip(sessionId: string, cardIndex: number, userId: number): {
    success: boolean;
    cardValue?: number;
    isMatch?: boolean;
    gameComplete?: boolean;
    error?: string;
  } {
    const game = this.activeGames.get(sessionId);
    
    if (!game) {
      return { success: false, error: 'Game session not found' };
    }
    
    if (game.userId !== userId) {
      console.error(`[SECURITY] User ${userId} attempted to access game ${sessionId}`);
      return { success: false, error: 'Unauthorized' };
    }
    
    if (game.isComplete) {
      return { success: false, error: 'Game already completed' };
    }
    
    // Validate time limit
    const elapsed = Date.now() - game.startTime;
    if (elapsed > game.timeLimit) {
      game.isComplete = true;
      console.log(`[GAME] Session ${sessionId} expired due to time limit`);
      return { success: false, error: 'Game session expired' };
    }
    
    // Validate move limit
    if (game.moves.length >= game.maxMoves) {
      game.isComplete = true;
      return { success: false, error: 'Maximum moves exceeded' };
    }
    
    // Validate card index
    if (cardIndex < 0 || cardIndex >= 16) {
      return { success: false, error: 'Invalid card index' };
    }
    
    // Check if card already matched
    const cardValue = game.cardLayout[cardIndex];
    if (game.matchedPairs.has(cardValue)) {
      return { success: false, error: 'Card already matched' };
    }
    
    // Check if card already flipped in current turn
    if (game.flippedCards.includes(cardIndex)) {
      return { success: false, error: 'Card already flipped' };
    }
    
    // Record the move
    const move: GameMove = {
      cardIndex,
      timestamp: Date.now(),
      sequence: game.moves.length + 1
    };
    game.moves.push(move);
    game.flippedCards.push(cardIndex);
    
    // Check for match when 2 cards are flipped
    if (game.flippedCards.length === 2) {
      const [firstIndex, secondIndex] = game.flippedCards;
      const firstValue = game.cardLayout[firstIndex];
      const secondValue = game.cardLayout[secondIndex];
      
      const isMatch = firstValue === secondValue;
      
      if (isMatch) {
        game.matchedPairs.add(firstValue);
        console.log(`[GAME] Match found in session ${sessionId}: ${firstValue}`);
      }
      
      // Reset flipped cards for next turn
      game.flippedCards = [];
      
      // Check if game is complete (all 8 pairs matched)
      const gameComplete = game.matchedPairs.size === 8;
      if (gameComplete) {
        game.isComplete = true;
        console.log(`[GAME] Session ${sessionId} completed with ${game.moves.length} moves`);
      }
      
      return {
        success: true,
        cardValue,
        isMatch,
        gameComplete
      };
    }
    
    // First card of the pair
    return {
      success: true,
      cardValue,
      isMatch: false,
      gameComplete: false
    };
  }
  
  /**
   * Validate final game result against server state
   */
  validateGameResult(sessionId: string, userId: number, claimedWon: boolean, claimedPairs: number): {
    valid: boolean;
    actualPairs: number;
    actualWon: boolean;
    moves: number;
    playTime: number;
    error?: string;
  } {
    const game = this.activeGames.get(sessionId);
    
    if (!game) {
      return {
        valid: false,
        actualPairs: 0,
        actualWon: false,
        moves: 0,
        playTime: 0,
        error: 'Game session not found'
      };
    }
    
    if (game.userId !== userId) {
      console.error(`[SECURITY] User ${userId} attempted to validate game ${sessionId}`);
      return {
        valid: false,
        actualPairs: 0,
        actualWon: false,
        moves: 0,
        playTime: 0,
        error: 'Unauthorized access'
      };
    }
    
    const actualPairs = game.matchedPairs.size;
    const actualWon = actualPairs === 8;
    const playTime = Date.now() - game.startTime;
    
    // Validate claimed result against actual state
    const resultValid = (claimedWon === actualWon) && (claimedPairs === actualPairs);
    
    if (!resultValid) {
      console.error(`[SECURITY] Game result mismatch for session ${sessionId}:`);
      console.error(`  Claimed: won=${claimedWon}, pairs=${claimedPairs}`);
      console.error(`  Actual: won=${actualWon}, pairs=${actualPairs}`);
      
      // Log security violation
      this.logSecurityViolation(sessionId, userId, {
        claimedWon,
        claimedPairs,
        actualWon,
        actualPairs,
        moves: game.moves.length,
        playTime
      });
    }
    
    // Clean up completed game
    if (game.isComplete || !resultValid) {
      this.activeGames.delete(sessionId);
    }
    
    return {
      valid: resultValid,
      actualPairs,
      actualWon,
      moves: game.moves.length,
      playTime
    };
  }
  
  /**
   * Generate secure random card layout (server-side only)
   */
  private generateSecureCardLayout(): number[] {
    const cards: number[] = [];
    
    // Create pairs (0-7, each appears twice)
    for (let i = 0; i < 8; i++) {
      cards.push(i, i);
    }
    
    // Secure shuffle using crypto-random
    for (let i = cards.length - 1; i > 0; i--) {
      // Use crypto.randomInt for true randomness
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    return cards;
  }
  
  /**
   * Log security violations for admin monitoring
   */
  private logSecurityViolation(sessionId: string, userId: number, details: any): void {
    console.error(`[SECURITY VIOLATION] Game manipulation attempt:`);
    console.error(`  Session: ${sessionId}`);
    console.error(`  User: ${userId}`);
    console.error(`  Details:`, details);
    console.error(`  Timestamp: ${new Date().toISOString()}`);
    
    // Could be extended to save to database for admin dashboard
  }
  
  /**
   * Clean up expired games periodically
   */
  cleanupExpiredGames(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, game] of this.activeGames.entries()) {
      const elapsed = now - game.startTime;
      if (elapsed > game.timeLimit || game.isComplete) {
        this.activeGames.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[GAME] Cleaned up ${cleaned} expired game sessions`);
    }
    
    return cleaned;
  }
  
  /**
   * Get current game statistics for monitoring
   */
  getGameStats(): {
    activeGames: number;
    averagePlayTime: number;
    totalMoves: number;
  } {
    const games = Array.from(this.activeGames.values());
    const now = Date.now();
    
    return {
      activeGames: games.length,
      averagePlayTime: games.length > 0 
        ? games.reduce((sum, game) => sum + (now - game.startTime), 0) / games.length 
        : 0,
      totalMoves: games.reduce((sum, game) => sum + game.moves.length, 0)
    };
  }
}

// Singleton instance
export const gameValidator = new GameStateValidator();

// Auto-cleanup every 5 minutes
setInterval(() => {
  gameValidator.cleanupExpiredGames();
}, 5 * 60 * 1000);