/**
 * SECURE MEMORY GAME ENGINE - 100% SERVER-SIDE
 * 
 * Este sistema elimina TODA confiança no cliente para operações do jogo.
 * O servidor controla completamente:
 * - Estado das cartas e posições
 * - Validação de movimentos
 * - Cálculo de resultados
 * - Detecção de trapaça
 */

interface CardPosition {
  id: number;
  value: number; // 1-8 (pares)
  isRevealed: boolean;
  isMatched: boolean;
  revealedAt?: Date;
}

interface GameMove {
  cardId: number;
  timestamp: Date;
  timeSinceStart: number;
}

interface SecureGameState {
  sessionId: string;
  userId: number;
  betAmount: number;
  cards: CardPosition[];
  moves: GameMove[];
  currentRevealedCards: number[];
  matchedPairs: number;
  totalMoves: number;
  startTime: Date;
  endTime?: Date;
  isWon: boolean;
  isCompleted: boolean;
  lastMoveTime: Date;
}

class SecureGameEngine {
  private games = new Map<string, SecureGameState>();
  private readonly CARD_COUNT = 16;
  private readonly PAIR_COUNT = 8;
  private readonly MAX_REVEALED_CARDS = 2;

  /**
   * Inicializa um novo jogo com cartas embaralhadas pelo servidor
   */
  createGame(sessionId: string, userId: number, betAmount: number): SecureGameState {
    const cards = this.generateSecureCardLayout();
    
    const gameState: SecureGameState = {
      sessionId,
      userId,
      betAmount,
      cards,
      moves: [],
      currentRevealedCards: [],
      matchedPairs: 0,
      totalMoves: 0,
      startTime: new Date(),
      isWon: false,
      isCompleted: false,
      lastMoveTime: new Date()
    };

    this.games.set(sessionId, gameState);
    
    console.log(`[SECURE GAME] Created game ${sessionId} for user ${userId} with bet ${betAmount}`);
    return gameState;
  }

  /**
   * Gera layout seguro de cartas - 100% server-side
   */
  private generateSecureCardLayout(): CardPosition[] {
    const cards: CardPosition[] = [];
    
    // Criar pares de cartas (1-8, cada valor aparece 2 vezes)
    for (let value = 1; value <= this.PAIR_COUNT; value++) {
      cards.push({
        id: cards.length,
        value,
        isRevealed: false,
        isMatched: false
      });
      cards.push({
        id: cards.length,
        value,
        isRevealed: false,
        isMatched: false
      });
    }

    // Embaralhar usando algoritmo Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
      // Atualizar IDs após embaralhamento
      cards[i].id = i;
      cards[j].id = j;
    }

    return cards;
  }

  /**
   * Processa movimento do jogador - VALIDAÇÃO 100% SERVER-SIDE
   */
  processMove(sessionId: string, userId: number, cardId: number): {
    success: boolean;
    error?: string;
    gameState?: any;
    moveResult?: 'revealed' | 'matched' | 'no_match' | 'game_won';
  } {
    const game = this.games.get(sessionId);
    
    if (!game) {
      return { success: false, error: 'Game session not found' };
    }

    if (game.userId !== userId) {
      console.error(`SECURITY VIOLATION: User ${userId} tried to access game ${sessionId} belonging to user ${game.userId}`);
      return { success: false, error: 'Unauthorized access' };
    }

    if (game.isCompleted) {
      return { success: false, error: 'Game already completed' };
    }

    // Validar ID da carta
    if (cardId < 0 || cardId >= this.CARD_COUNT) {
      console.error(`SECURITY VIOLATION: User ${userId} attempted invalid card ID ${cardId}`);
      return { success: false, error: 'Invalid card ID' };
    }

    const card = game.cards[cardId];
    if (!card) {
      return { success: false, error: 'Card not found' };
    }

    // Validar se carta já foi revelada ou combinada
    if (card.isRevealed || card.isMatched) {
      return { success: false, error: 'Card already revealed or matched' };
    }

    // Validar limite de cartas reveladas simultaneamente
    if (game.currentRevealedCards.length >= this.MAX_REVEALED_CARDS) {
      return { success: false, error: 'Maximum revealed cards reached' };
    }

    // Revelar carta
    card.isRevealed = true;
    card.revealedAt = new Date();
    game.currentRevealedCards.push(cardId);
    game.totalMoves++;
    game.lastMoveTime = new Date();

    // Registrar movimento
    const timeSinceStart = new Date().getTime() - game.startTime.getTime();
    game.moves.push({
      cardId,
      timestamp: new Date(),
      timeSinceStart
    });

    let moveResult: 'revealed' | 'matched' | 'no_match' | 'game_won' = 'revealed';

    // Verificar se duas cartas foram reveladas
    if (game.currentRevealedCards.length === 2) {
      const [firstCardId, secondCardId] = game.currentRevealedCards;
      const firstCard = game.cards[firstCardId];
      const secondCard = game.cards[secondCardId];

      if (firstCard.value === secondCard.value) {
        // MATCH! Marcar cartas como combinadas
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        game.matchedPairs++;
        moveResult = 'matched';

        // Verificar vitória
        if (game.matchedPairs === this.PAIR_COUNT) {
          game.isWon = true;
          game.isCompleted = true;
          game.endTime = new Date();
          moveResult = 'game_won';
        }
      } else {
        // Não combinou - esconder cartas novamente após delay
        moveResult = 'no_match';
        // Cartas permanecem reveladas temporariamente para o cliente ver
      }

      // Limpar cartas reveladas
      game.currentRevealedCards = [];
    }

    // Retornar estado seguro (sem revelar posições das cartas não viradas)
    const safeGameState = this.getSafeGameState(game);

    return {
      success: true,
      gameState: safeGameState,
      moveResult
    };
  }

  /**
   * Processa flip de carta individual - NOVA IMPLEMENTAÇÃO
   */
  processCardFlip(sessionId: string, cardIndex: number, timestamp: number): {
    valid: boolean;
    error?: string;
    cardValue?: number;
    isMatch?: boolean;
    gameComplete?: boolean;
    matchedPairs?: number;
    movesLeft?: number;
  } {
    const game = this.games.get(sessionId);
    
    if (!game) {
      return { valid: false, error: 'Game session not found' };
    }

    console.log(`[SECURE ENGINE] Processing card flip - Session: ${sessionId}, Card: ${cardIndex}`);

    // Validar se o índice da carta é válido
    if (cardIndex < 0 || cardIndex >= this.CARD_COUNT) {
      console.log(`[SECURE ENGINE] Invalid card index: ${cardIndex}`);
      return { valid: false, error: 'Invalid card index' };
    }

    const card = game.cards[cardIndex];
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    // Se a carta já está revelada ou já foi combinada, movimento inválido
    if (card.isRevealed || card.isMatched) {
      console.log(`[SECURE ENGINE] Card already revealed or matched: ${cardIndex}`);
      return { valid: false, error: 'Card already revealed' };
    }

    // Verificar se já há 2 cartas viradas
    if (game.currentRevealedCards.length >= 2) {
      console.log(`[SECURE ENGINE] Too many cards revealed`);
      return { valid: false, error: 'Too many cards revealed' };
    }

    // Revelar a carta
    card.isRevealed = true;
    card.revealedAt = new Date(timestamp);
    game.currentRevealedCards.push(cardIndex);
    game.totalMoves++;
    game.lastMoveTime = new Date();
    
    // Registrar movimento
    game.moves.push({
      cardId: cardIndex,
      timestamp: new Date(timestamp),
      timeSinceStart: timestamp - game.startTime.getTime()
    });

    console.log(`[SECURE ENGINE] Card ${cardIndex} revealed, value: ${card.value}`);

    // Verificar se há match
    let isMatch = false;
    let gameComplete = false;

    if (game.currentRevealedCards.length === 2) {
      const [firstCardId, secondCardId] = game.currentRevealedCards;
      const firstCard = game.cards[firstCardId];
      const secondCard = game.cards[secondCardId];

      // Verificar se as duas cartas fazem par
      if (firstCard.value === secondCard.value) {
        // Match encontrado
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        game.matchedPairs++;
        isMatch = true;
        
        console.log(`[SECURE ENGINE] Match found! Pairs: ${game.matchedPairs}/${this.PAIR_COUNT}`);
        
        // Verificar se o jogo foi completado
        if (game.matchedPairs === this.PAIR_COUNT) {
          game.isWon = true;
          game.isCompleted = true;
          game.endTime = new Date();
          gameComplete = true;
          console.log(`[SECURE ENGINE] Game completed! User won!`);
        }
      } else {
        console.log(`[SECURE ENGINE] No match - cards will be hidden`);
      }
      
      // Limpar lista de cartas reveladas
      game.currentRevealedCards = [];
    }

    return {
      valid: true,
      cardValue: card.value,
      isMatch,
      gameComplete,
      matchedPairs: game.matchedPairs,
      movesLeft: Math.max(0, 50 - game.totalMoves)
    };
  }

  /**
   * Esconde cartas não combinadas após delay
   */
  hideUnmatchedCards(sessionId: string): void {
    const game = this.games.get(sessionId);
    if (!game) return;

    // Esconder cartas reveladas que não foram combinadas
    game.cards.forEach(card => {
      if (card.isRevealed && !card.isMatched) {
        card.isRevealed = false;
        card.revealedAt = undefined;
      }
    });
  }

  /**
   * Retorna estado seguro do jogo (sem revelar cartas viradas para baixo)
   */
  getSafeGameState(game: SecureGameState): any {
    return {
      sessionId: game.sessionId,
      matchedPairs: game.matchedPairs,
      totalMoves: game.totalMoves,
      isWon: game.isWon,
      isCompleted: game.isCompleted,
      playTime: game.endTime ? 
        game.endTime.getTime() - game.startTime.getTime() : 
        new Date().getTime() - game.startTime.getTime(),
      cards: game.cards.map(card => ({
        id: card.id,
        value: (card.isRevealed || card.isMatched) ? card.value : null,
        isRevealed: card.isRevealed,
        isMatched: card.isMatched
      }))
    };
  }

  /**
   * Obtém estado completo do jogo (apenas para validação server-side)
   */
  getCompleteGameState(sessionId: string): SecureGameState | undefined {
    return this.games.get(sessionId);
  }

  /**
   * Valida integridade do jogo contra tentativas de manipulação
   */
  validateGameIntegrity(sessionId: string, userId: number): {
    valid: boolean;
    actualState: any;
    violations: string[];
  } {
    const game = this.games.get(sessionId);
    const violations: string[] = [];

    if (!game) {
      violations.push('Game session not found');
      return { valid: false, actualState: null, violations };
    }

    if (game.userId !== userId) {
      violations.push('User ID mismatch');
    }

    // Validar timing suspeito
    const playTime = new Date().getTime() - game.startTime.getTime();
    if (game.isWon && playTime < 15000) { // Menos de 15 segundos
      violations.push(`Suspiciously fast completion time: ${playTime}ms`);
    }

    // Validar número de movimentos
    if (game.isWon && game.totalMoves < 16) { // Impossível ganhar com menos de 16 movimentos
      violations.push(`Invalid move count for win: ${game.totalMoves}`);
    }

    // Validar consistência de pares
    if (game.matchedPairs !== this.countActualMatches(game)) {
      violations.push('Matched pairs count inconsistency');
    }

    return {
      valid: violations.length === 0,
      actualState: this.getSafeGameState(game),
      violations
    };
  }

  private countActualMatches(game: SecureGameState): number {
    let matches = 0;
    const matchedValues = new Set<number>();
    
    game.cards.forEach(card => {
      if (card.isMatched && !matchedValues.has(card.value)) {
        matchedValues.add(card.value);
        matches++;
      }
    });
    
    return matches;
  }

  /**
   * Remove jogo da memória após conclusão
   */
  cleanupGame(sessionId: string): void {
    this.games.delete(sessionId);
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats(): any {
    return {
      activeGames: this.games.size,
      totalGamesCreated: this.games.size, // Simplificado
      suspiciousActivities: 0 // Implementar contador se necessário
    };
  }
}

export const secureGameEngine = new SecureGameEngine();