import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useAudio } from "./useAudio";
import { useBalance } from "./useBalance";
import { useGameSettings } from "./useGameSettings";
import { createGameSession, updateGameResult, decryptCardPositions } from "@/lib/api/gameApi";
import { generateCardPairs, shuffleArray } from "@/lib/gameLogic/memoryGameLogic";
import { validateGameIntegrity } from "@/lib/gameLogic/antiCheat";
import type { GameState, Card } from "@/types/game";

interface MemoryGameState {
  gameState: GameState;
  gameTimer: NodeJS.Timeout | null;
  initializeGame: () => Promise<void>;
  startGame: (betAmount: number, sessionId?: string) => Promise<void>;
  startTimer: () => void;
  flipCard: (index: number) => void;
  resetGame: () => void;
  endGame: (won: boolean) => Promise<void>;
}

// PROTEÇÃO ANTI-MÚLTIPLAS SESSÕES
const GAME_SESSION_KEY = 'memoria_premiada_active_session';
const HEARTBEAT_INTERVAL = 5000; // 5 segundos

const initialGameState: GameState = {
  phase: 'betting',
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  currentBet: 0,
  timeLeft: 300, // Será atualizado pelo servidor Hash-Only
  maxTime: 300, // Será atualizado pelo servidor Hash-Only
  movesLeft: 100, // Será atualizado pelo servidor Hash-Only
  maxMoves: 100, // Será atualizado pelo servidor Hash-Only
  gameSessionId: null,
  startTime: null,
  isBlocked: false,
  timerStarted: false,
  moves: [], // Track all moves for hash validation
};

export const useMemoryGame = create<MemoryGameState>()(
  subscribeWithSelector((set, get) => ({
    gameState: initialGameState,
    gameTimer: null,

    initializeGame: async () => {
      const gameSettings = useGameSettings.getState();
      await gameSettings.fetchSettings();
      
      const cards = generateCardPairs();
      set(state => ({
        gameState: {
          ...initialGameState,
          cards: shuffleArray(cards),
          timeLeft: gameSettings.maxTime,
          maxTime: gameSettings.maxTime,
          movesLeft: gameSettings.maxMoves,
          maxMoves: gameSettings.maxMoves,
        }
      }));
    },

    startGame: async (betAmount: number, sessionId?: string, theme?: string) => {
      try {
        // PROTEÇÃO ANTI-MÚLTIPLAS SESSÕES: Verificar se já existe sessão ativa
        const existingSession = localStorage.getItem(GAME_SESSION_KEY);
        if (existingSession && !sessionId) {
          const sessionData = JSON.parse(existingSession);
          if (Date.now() - sessionData.timestamp < 300000) { // 5 minutos
            console.log('[SECURITY] Active game session detected. Blocking new game.');
            throw new Error('Você já tem um jogo ativo. Termine o jogo atual antes de iniciar outro.');
          }
        }
        
        let gameData;
        if (!sessionId) {
          gameData = await createGameSession(betAmount, theme || 'UNI');
          
          // Registrar nova sessão ativa
          localStorage.setItem(GAME_SESSION_KEY, JSON.stringify({
            sessionId: gameData.sessionId,
            timestamp: Date.now()
          }));
        } else {
          // Se sessionId já existe, buscar dados do servidor
          throw new Error('Restart game required');
        }
        
        // CORRETO: Servidor define posições, cliente descriptografa localmente
        const cardPositions = decryptCardPositions(
          gameData.encryptedPositions, 
          gameData.gameKey, 
          gameData.sessionId
        );
        
        // Criar cartas baseadas nas posições do servidor com ícones corretos do tema
        const cards = cardPositions.map((pairId, index) => ({
          id: index.toString(),
          pairId: pairId,
          value: pairId,
          isFlipped: false,
          isMatched: false,
          icon: gameData.themeIcons[pairId - 1] || gameData.themeIcons[0] // Usar ícones do tema selecionado
        }));
        
        set(state => ({
          gameState: {
            ...state.gameState,
            phase: 'playing',
            cards: cards,
            currentBet: betAmount,
            timeLeft: gameData.maxTime,
            maxTime: gameData.maxTime,
            movesLeft: gameData.maxMoves,
            maxMoves: gameData.maxMoves,
            matchedPairs: 0,
            flippedCards: [],
            gameSessionId: gameData.sessionId,
            startTime: Date.now(),
            timerStarted: false,
            moves: [],
          }
        }));


        const { gameTimer } = get();
        if (gameTimer) {
          clearInterval(gameTimer);
        }
        set({ gameTimer: null });

      } catch (error) {
        console.error('Failed to start game:', error);
        throw error;
      }
    },

    startTimer: () => {
      const { gameTimer } = get();
      if (gameTimer) {
        clearInterval(gameTimer);
      }

      const timer = setInterval(() => {
        const currentState = get();
        if (currentState.gameState.phase !== 'playing' || !currentState.gameState.timerStarted) {
          return;
        }

        set(state => {
          const newTimeLeft = state.gameState.timeLeft - 1;
          
          if (newTimeLeft <= 0) {
            clearInterval(timer);
            setTimeout(() => {
              const latestState = get();
              if (latestState.gameState.phase === 'playing') {
                get().endGame(false);
              }
            }, 100);
            return {
              ...state,
              gameState: {
                ...state.gameState,
                timeLeft: 0,
              },
              gameTimer: null,
            };
          }
          
          return {
            ...state,
            gameState: {
              ...state.gameState,
              timeLeft: newTimeLeft,
            }
          };
        });
      }, 1000);

      set({ gameTimer: timer });
    },

    flipCard: (index: number, serverCardValue?: number) => {
      const { gameState } = get();
      
      if (gameState.phase !== 'playing') return;
      if (gameState.isBlocked) return;
      if (gameState.flippedCards.length >= 2) return;
      if (gameState.cards[index].isFlipped || gameState.cards[index].isMatched) return;
      if (gameState.movesLeft <= 0) return;

      // Start timer on first card click
      if (!gameState.timerStarted) {
        set(state => ({
          gameState: {
            ...state.gameState,
            timerStarted: true,
          }
        }));
        get().startTimer();
      }

      if (!validateGameIntegrity(gameState)) {
        console.error('Game integrity violation detected');
        get().endGame(false);
        return;
      }

      set(state => {
        const newCards = [...state.gameState.cards];
        const newFlippedCards = [...state.gameState.flippedCards, index];
        const newMoves = [...state.gameState.moves, { cardIndex: index, timestamp: Date.now() }];
        
        newCards[index].isFlipped = true;

        let newMatchedPairs = state.gameState.matchedPairs;
        let newMovesLeft = state.gameState.movesLeft;
        let newIsBlocked = state.gameState.isBlocked;

        if (newFlippedCards.length === 2) {
          newIsBlocked = true;
        }

        if (newFlippedCards.length === 2) {
          const [firstIndex, secondIndex] = newFlippedCards;
          const firstCard = newCards[firstIndex];
          const secondCard = newCards[secondIndex];

          newMovesLeft--;

          if (firstCard.pairId === secondCard.pairId) {
            newCards[firstIndex].isMatched = true;
            newCards[secondIndex].isMatched = true;
            newMatchedPairs++;
            
            const audio = useAudio.getState();
            audio.playSuccess();

            setTimeout(() => {
              set(state => ({
                gameState: {
                  ...state.gameState,
                  flippedCards: [],
                  isBlocked: false,
                }
              }));
            }, 500);
          } else {
            setTimeout(() => {
              set(state => {
                const resetCards = [...state.gameState.cards];
                resetCards[firstIndex].isFlipped = false;
                resetCards[secondIndex].isFlipped = false;
                return {
                  gameState: {
                    ...state.gameState,
                    cards: resetCards,
                    flippedCards: [],
                    isBlocked: false,
                  }
                };
              });
            }, 1000);
          }
        }

        const newGameState = {
          ...state.gameState,
          cards: newCards,
          flippedCards: newFlippedCards,
          matchedPairs: newMatchedPairs,
          movesLeft: newMovesLeft,
          isBlocked: newIsBlocked,
          moves: newMoves,
        };

        if (newMatchedPairs === 8) {
          setTimeout(() => {
            get().endGame(true);
          }, 600);
        } else if (newMovesLeft <= 0) {
          setTimeout(() => {
            get().endGame(false);
          }, 1200);
        }

        return {
          ...state,
          gameState: newGameState,
        };
      });
    },

    resetGame: () => {
      const { gameTimer } = get();
      if (gameTimer) {
        clearInterval(gameTimer);
      }
      
      // PROTEÇÃO: Limpar sessão ativa no reset
      localStorage.removeItem(GAME_SESSION_KEY);
    
      
      set(state => ({
        gameState: {
          ...initialGameState,
          timeLeft: state.gameState.maxTime,
          maxTime: state.gameState.maxTime,
          movesLeft: state.gameState.maxMoves,
          maxMoves: state.gameState.maxMoves,
        },
        gameTimer: null,
      }));
    },

    endGame: async (won: boolean) => {
      const { gameState, gameTimer } = get();
      
      if (gameTimer) {
        clearInterval(gameTimer);
      }

      // PROTEÇÃO: Limpar sessão ativa quando jogo termina
      localStorage.removeItem(GAME_SESSION_KEY);


      // Play appropriate sound effect
      const audio = useAudio.getState();
      if (won) {
        audio.playVictory();
        console.log('🎉 Player won!');
      } else {
        audio.playGameOver();
        console.log('😢 Player lost!');
      }

      set(state => ({
        gameState: {
          ...state.gameState,
          phase: won ? 'won' : 'lost',
        },
        gameTimer: null,
      }));

      if (gameState.gameSessionId) {
        try {
          const gameTime = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;
          
          
          await updateGameResult(
            gameState.gameSessionId, 
            won, 
            gameState.matchedPairs,
            gameTime,
            gameState.moves
          );
          
          if (won) {
            await useBalance.getState().fetchBalance();
          }
        } catch (error) {
          console.error('Failed to update game result:', error);
        }
      }
    },
  }))
);

// Subscribe to game state changes for debugging
useMemoryGame.subscribe(
  (state) => state.gameState.phase,
  (phase) => {
    console.log(`Game phase changed to: ${phase}`);
  }
);