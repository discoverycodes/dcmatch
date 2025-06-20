import type { GameState } from "@/types/game";

// Anti-cheat validation functions
export function validateGameIntegrity(gameState: GameState): boolean {
  // Check if game session exists
  if (!gameState.gameSessionId) {
    console.warn('No game session ID found');
    return false;
  }

  // Check if game phase is valid
  if (!['betting', 'playing', 'won', 'lost'].includes(gameState.phase)) {
    console.warn('Invalid game phase');
    return false;
  }

  // Check if moves are within limits
  if (gameState.movesLeft < 0 || gameState.movesLeft > gameState.maxMoves) {
    console.warn('Invalid moves count');
    return false;
  }

  // Check if time is within limits
  if (gameState.timeLeft < 0 || gameState.timeLeft > gameState.maxTime) {
    console.warn('Invalid time left');
    return false;
  }

  // Check if matched pairs count is valid
  if (gameState.matchedPairs < 0 || gameState.matchedPairs > 8) {
    console.warn('Invalid matched pairs count');
    return false;
  }

  // Check if flipped cards count is valid
  if (gameState.flippedCards.length > 2) {
    console.warn('Too many flipped cards');
    return false;
  }

  return true;
}

export function validateGameTiming(gameState: GameState): boolean {
  if (!gameState.startTime) return false;
  
  const elapsed = Date.now() - gameState.startTime;
  const expectedTimeLeft = gameState.maxTime * 1000 - elapsed;
  const timeDifference = Math.abs(expectedTimeLeft - gameState.timeLeft * 1000);
  
  // Allow 2 second tolerance for network delays
  return timeDifference <= 2000;
}

export function validateCardFlip(gameState: GameState, cardIndex: number): boolean {
  // Check if card index is valid
  if (cardIndex < 0 || cardIndex >= gameState.cards.length) {
    console.warn('Invalid card index');
    return false;
  }

  // Check if card is already flipped or matched
  const card = gameState.cards[cardIndex];
  if (card.isFlipped || card.isMatched) {
    console.warn('Card already flipped or matched');
    return false;
  }

  // Check if too many cards are already flipped
  if (gameState.flippedCards.length >= 2) {
    console.warn('Too many cards already flipped');
    return false;
  }

  // Check if player has moves left
  if (gameState.movesLeft <= 0) {
    console.warn('No moves left');
    return false;
  }

  return true;
}

// Generate a game session hash for validation
export function generateGameHash(gameState: GameState): string {
  const data = {
    sessionId: gameState.gameSessionId,
    bet: gameState.currentBet,
    matches: gameState.matchedPairs,
    moves: gameState.maxMoves - gameState.movesLeft,
    timeElapsed: gameState.maxTime - gameState.timeLeft,
  };
  
  // Simple hash function (in production, use a proper cryptographic hash)
  return btoa(JSON.stringify(data));
}
