/**
 * SECURE MEMORY GAME COMPONENT - 100% Server-Side Validation
 * 
 * Este componente elimina toda possibilidade de manipulação client-side:
 * - Não mantém estado local do jogo
 * - Todos os movimentos são validados no servidor
 * - Resultados calculados apenas server-side
 * - Impossível hackear ou manipular
 */

import React, { useState, useEffect } from 'react';
import { secureGameApi, type SecureGameState, type GameMoveResponse } from '../lib/secureGameApi';

interface SecureMemoryGameProps {
  betAmount: number;
  onGameEnd: (won: boolean, winAmount: number, newBalance: number) => void;
  onError: (error: string) => void;
}

export function SecureMemoryGame({ betAmount, onGameEnd, onError }: SecureMemoryGameProps) {
  const [gameState, setGameState] = useState<SecureGameState | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Inicializar jogo quando componente monta
  useEffect(() => {
    if (!gameStarted) {
      startSecureGame();
    }
  }, [gameStarted]);

  const startSecureGame = async () => {
    setIsLoading(true);
    try {
      console.log(`Starting secure game with bet: R$ ${betAmount}`);
      
      const response = await secureGameApi.startGame(betAmount);
      
      console.log('Secure game started:', response);
      
      setSessionId(response.sessionId);
      setGameState(response.gameState);
      setGameStarted(true);
      
    } catch (error) {
      console.error('Failed to start secure game:', error);
      onError(error instanceof Error ? error.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (cardId: number) => {
    if (!gameState || !sessionId || isProcessingMove) return;
    
    // Verificar se carta já está revelada ou combinada
    const card = gameState.cards[cardId];
    if (!card || card.isRevealed || card.isMatched) {
      return;
    }

    // Verificar se já temos 2 cartas selecionadas
    const revealedCards = gameState.cards.filter(c => c.isRevealed && !c.isMatched);
    if (revealedCards.length >= 2) {
      return;
    }

    setIsProcessingMove(true);
    
    try {
      console.log(`Making move: card ${cardId}`);
      
      const moveResponse: GameMoveResponse = await secureGameApi.makeMove(sessionId, cardId);
      
      console.log('Move result:', moveResponse);
      
      // Atualizar estado com resposta do servidor
      setGameState(moveResponse.gameState);
      
      // Se jogo foi ganho, finalizar
      if (moveResponse.moveResult === 'game_won') {
        console.log('Game won! Finalizing...');
        setTimeout(() => finalizeGame(), 1000);
      }
      
      // Se não combinou, esconder cartas após delay
      if (moveResponse.moveResult === 'no_match') {
        setTimeout(async () => {
          try {
            // Buscar estado atualizado do servidor
            const updatedState = await secureGameApi.getGameState(sessionId);
            setGameState(updatedState);
          } catch (error) {
            console.error('Failed to update game state:', error);
          }
        }, 2500);
      }
      
    } catch (error) {
      console.error('Move failed:', error);
      onError(error instanceof Error ? error.message : 'Move failed');
    } finally {
      setIsProcessingMove(false);
    }
  };

  const finalizeGame = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Finalizing game...');
      
      const result = await secureGameApi.finalizeGame(sessionId);
      
      console.log('Game finalized:', result);
      
      onGameEnd(result.won, result.winAmount, result.newBalance);
      
    } catch (error) {
      console.error('Failed to finalize game:', error);
      onError(error instanceof Error ? error.message : 'Failed to finalize game');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando jogo seguro...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar jogo</p>
          <button 
            onClick={startSecureGame}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Game Stats */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{gameState.matchedPairs}</div>
            <div className="text-sm text-gray-600">Pares Encontrados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{gameState.totalMoves}</div>
            <div className="text-sm text-gray-600">Movimentos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.floor(gameState.playTime / 1000)}s
            </div>
            <div className="text-sm text-gray-600">Tempo</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">R$ {betAmount.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Aposta</div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {gameState.cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={isProcessingMove || card.isRevealed || card.isMatched}
              className={`
                aspect-square rounded-lg border-2 transition-all duration-300 text-2xl font-bold
                ${card.isMatched 
                  ? 'bg-green-100 border-green-400 text-green-800 cursor-not-allowed' 
                  : card.isRevealed 
                    ? 'bg-blue-100 border-blue-400 text-blue-800' 
                    : 'bg-gray-100 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                }
                ${isProcessingMove ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {(card.isRevealed || card.isMatched) && card.value ? (
                // Mostrar emoji baseado no valor da carta
                ['🎯', '🎪', '🎨', '🎭', '🎪', '🎯', '🎨', '🎭'][card.value - 1]
              ) : (
                '?'
              )}
            </button>
          ))}
        </div>

        {/* Processing indicator */}
        {isProcessingMove && (
          <div className="text-center mt-4">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-600">Processando movimento...</span>
            </div>
          </div>
        )}

        {/* Security indicator */}
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="text-green-600 mr-2">🔒</div>
            <span className="text-sm text-green-800">
              Jogo 100% seguro - Validação server-side ativa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}