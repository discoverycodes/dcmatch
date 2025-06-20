/**
 * SECURE GAME API - 100% Server-Side Validation
 * 
 * Esta API elimina TODA confiança no cliente para operações do jogo.
 * Todos os movimentos, validações e cálculos são feitos no servidor.
 */

interface SecureGameState {
  sessionId: string;
  matchedPairs: number;
  totalMoves: number;
  isWon: boolean;
  isCompleted: boolean;
  playTime: number;
  cards: Array<{
    id: number;
    value: number | null; // null = carta virada para baixo
    isRevealed: boolean;
    isMatched: boolean;
  }>;
}

interface GameStartResponse {
  sessionId: string;
  success: boolean;
  newBalance: number;
  gameState: SecureGameState;
}

interface GameMoveResponse {
  success: boolean;
  moveResult: 'revealed' | 'matched' | 'no_match' | 'game_won';
  gameState: SecureGameState;
}

interface GameFinalizeResponse {
  success: boolean;
  won: boolean;
  winAmount: number;
  newBalance: number;
  gameStats: {
    totalMoves: number;
    matchedPairs: number;
    playTime: number;
  };
}

class SecureGameApi {
  /**
   * Inicia novo jogo - servidor controla tudo
   */
  async startGame(betAmount: number): Promise<GameStartResponse> {
    const response = await fetch('/api/game/memory/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ betAmount })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start game');
    }

    return response.json();
  }

  /**
   * Move carta - processado 100% no servidor
   */
  async makeMove(sessionId: string, cardId: number): Promise<GameMoveResponse> {
    const response = await fetch('/api/game/memory/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ sessionId, cardId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid move');
    }

    return response.json();
  }

  /**
   * Finaliza jogo - cálculos 100% server-side
   */
  async finalizeGame(sessionId: string): Promise<GameFinalizeResponse> {
    const response = await fetch('/api/game/memory/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to finalize game');
    }

    return response.json();
  }

  /**
   * Obtém estado atual do servidor
   */
  async getGameState(sessionId: string): Promise<SecureGameState> {
    const response = await fetch(`/api/game/memory/state/${sessionId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get game state');
    }

    const data = await response.json();
    return data.gameState;
  }
}

export const secureGameApi = new SecureGameApi();
export type { SecureGameState, GameStartResponse, GameMoveResponse, GameFinalizeResponse };