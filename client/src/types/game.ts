export interface Card {
  id: string;
  pairId: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface GameState {
  phase: 'betting' | 'playing' | 'won' | 'lost';
  cards: Card[];
  flippedCards: number[];
  matchedPairs: number;
  currentBet: number;
  timeLeft: number;
  maxTime: number;
  movesLeft: number;
  maxMoves: number;
  gameSessionId: string | null;
  startTime: number | null;
  isBlocked: boolean;
  timerStarted: boolean;
  moves: Array<{ cardIndex: number; timestamp: number }>;
}

export interface GameSettings {
  maxTime: number;
  maxMoves: number;
  winMultiplier: number;
  minBet: number;
  maxBet: number;
}

export interface GameResult {
  sessionId: string;
  won: boolean;
  matchedPairs: number;
  timeUsed: number;
  movesUsed: number;
  betAmount: number;
  winAmount: number;
  timestamp: number;
}
