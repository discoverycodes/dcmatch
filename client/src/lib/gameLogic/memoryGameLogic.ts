import type { Card } from "@/types/game";

// Card icons/symbols for the memory game
const CARD_ICONS = [
  '💎', '🎰', '🎲', '🃏', 
  '🎯', '🎪', '🎨', '🎭'
];

export function generateCardPairs(): Card[] {
  const cards: Card[] = [];
  
  // Create pairs of cards
  CARD_ICONS.forEach((icon, index) => {
    // First card of the pair
    cards.push({
      id: `${index}-a`,
      pairId: index,
      icon,
      isFlipped: false,
      isMatched: false,
    });
    
    // Second card of the pair
    cards.push({
      id: `${index}-b`,
      pairId: index,
      icon,
      isFlipped: false,
      isMatched: false,
    });
  });
  
  return cards;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function calculateWinAmount(betAmount: number, multiplier: number = 2): number {
  return betAmount * multiplier;
}

export function isGameWon(matchedPairs: number, totalPairs: number = 8): boolean {
  return matchedPairs === totalPairs;
}

export function isGameLost(timeLeft: number, movesLeft: number, matchedPairs: number): boolean {
  return (timeLeft <= 0 || movesLeft <= 0) && matchedPairs < 8;
}
