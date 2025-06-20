import { useState, useEffect } from 'react';
import { useMemoryGame } from '../../lib/stores/useMemoryGame';
import { useGameSettings } from '../../lib/stores/useGameSettings';
import { useAudio } from '../../lib/stores/useAudio';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { sendCardFlip } from '../../lib/api/gameApi';
import { Button } from '../ui/button';
import { User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import GameUI from './GameUI';
import BettingPanel from './BettingPanel';
import ResultModal from './ResultModal';
import { ThemeBackground } from './ThemeBackground';
import { usePreventReloadWhenGameActive } from "../../hooks/usePreventReloadWhenGameActive";


export default function MemoryGame() {
  const { gameState, flipCard } = useMemoryGame();
  const { playHit, initializeAudio, isInitialized } = useAudio();
  const { settings } = useSiteSettings();
  const [showBettingPanel, setShowBettingPanel] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  usePreventReloadWhenGameActive(gameState.phase === "playing");

  const handleCardClick = (index: number) => {
    if (gameState.phase !== 'playing') return;
    
    playHit();
    flipCard(index);
  };

  // Initialize audio and check authentication status on component mount
  useEffect(() => {
    // Initialize audio system
    if (!isInitialized) {
      initializeAudio();
    }
    
    // Only check auth status if there's a stored user or session cookie
    const checkAuthStatus = async () => {
      const userData = localStorage.getItem('user');
      const hasCookie = document.cookie.includes('memoria-premiada-session');
      
      if (!userData && !hasCookie) {
        setIsLoggedIn(false);
        return;
      }
      
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        setIsLoggedIn(response.ok);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuthStatus();
  }, [initializeAudio, isInitialized]);

  const checkAuthAndStartGame = async (theme: string) => {
    setIsCheckingAuth(true);
    setSelectedTheme(theme);
    
    try {
      // Check if user is authenticated by verifying their session
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (response.ok) {
        // User is authenticated, show betting panel
        setIsCheckingAuth(false);
        setShowBettingPanel(true);
      } else {
        // User is not authenticated, redirect to login
        setIsCheckingAuth(false);
        toast.info('Entre em sua conta para Jogar', {
          duration: 4000,
          action: {
            label: "Fazer Login",
            onClick: () => window.location.href = '/login'
          }
        });
        
        // Redirect after a short delay for better UX
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
      }
    } catch (error) {
      // Network error or other issues - treat as not authenticated
      setIsCheckingAuth(false);
      toast.error('Entre em sua conta para Jogar');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    }
  };

  // Create visual demo cards for the background grid (6x6 = 36 cards)
  const demoCards = [
    { icon: '🎯', isVisible: true },
    { icon: '🎪', isVisible: false },
    { icon: '🎭', isVisible: true },
    { icon: '🎨', isVisible: false },
    { icon: '🎰', isVisible: true },
    { icon: '🎲', isVisible: false },
    { icon: '🎻', isVisible: true },
    { icon: '🎹', isVisible: false },
    { icon: '🎺', isVisible: true },
    { icon: '🎸', isVisible: false },
    { icon: '🎤', isVisible: true },
    { icon: '🎧', isVisible: false },
    { icon: '🎬', isVisible: true },
    { icon: '🎮', isVisible: false },
    { icon: '🎯', isVisible: true },
    { icon: '🎪', isVisible: false }
  ];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Navigation Button - Only visible for logged in users */}
      {isLoggedIn && (gameState.phase === 'betting' && !showBettingPanel) && (
        <div className="absolute top-4 right-4 z-50">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <User className="w-4 h-4 mr-2" />
            Conta
          </Button>
        </div>
      )}

      {/* Premium Background with Animated Gradient */}
      <div className={`absolute inset-0 animate-gradient-x ${
        gameState.phase === 'playing' 
          ? 'bg-gradient-to-br from-slate-900 to-slate-900' 
          : 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
      }`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent"></div>
      </div>
      
      {/* Theme-based Background Elements */}
      {gameState.phase === 'playing' ? (
        <ThemeBackground theme={selectedTheme || 'UNI'} />
      ) : (
        // Original background for theme selection screen
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 text-yellow-400/20 text-6xl animate-float">♠</div>
          <div className="absolute top-20 right-20 text-yellow-400/20 text-6xl animate-float-delayed">♥</div>
          <div className="absolute bottom-20 left-20 text-yellow-400/20 text-6xl animate-float">♦</div>
          <div className="absolute bottom-10 right-10 text-yellow-400/20 text-6xl animate-float-delayed">♣</div>
          <div className="absolute top-1/2 left-5 text-yellow-400/10 text-3xl animate-spin-slow">★</div>
          <div className="absolute top-1/3 right-5 text-yellow-400/10 text-3xl animate-spin-slow">★</div>
        </div>
      )}

      {/* Visual Background Grid - Non-playable - Only show when not playing */}
      {gameState.phase !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center z-5 opacity-30">
          <div className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-3 max-w-sm sm:max-w-md md:max-w-lg">
            {demoCards.map((card, index) => (
              <div
                key={index}
                className="aspect-square bg-gradient-to-br from-purple-800/50 via-purple-700/40 to-purple-900/50 rounded-lg sm:rounded-xl border-2 border-purple-400/30 flex items-center justify-center text-5xl sm:text-5xl md:text-6xl pointer-events-none"
              >
                {card.isVisible ? (
                  <span className="text-yellow-300/80 animate-pulse-gentle">{card.icon}</span>
                ) : (
                  <span className="text-yellow-400/50 animate-pulse">★</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {gameState.phase === 'betting' && !showBettingPanel ? (
        <div className="flex flex-col items-center justify-center h-full relative z-10 p-4">
          {/* Logo Area */}
          <div className="text-center mb-1 sm:mb-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-yellow-400/20 blur-2xl sm:blur-3xl animate-pulse-slow"></div>
              {settings?.logoLight ? (
                <div className="relative z-10 mx-auto mb-4 flex justify-center">
                  <img 
                    src={settings.logoLight} 
                    alt="Logo" 
                    className="h-32 sm:h-40 md:h-48 w-auto object-contain drop-shadow-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                </div>
              ) : (
                <div >
                
                </div>
              )}
            </div>
          </div>

          {/* Theme Selection Buttons */}
          <div className="space-y-2 mt-2">
            <h2 className="text-center text-white text-lg font-semibold mb-4">Escolha seu Estilo de Jogo</h2>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              {/* ESPORTES */}
              <Button
                onClick={(e) => { e.preventDefault(); checkAuthAndStartGame('ESP'); }}
                disabled={isCheckingAuth}
                className="relative bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black font-bold text-lg h-20 rounded-2xl shadow-xl shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">⚽</span>
                  <span className="text-xs font-semibold">ESPORTES</span>
                </div>
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </Button>

              {/* ANIMAIS */}
              <Button
                onClick={(e) => { e.preventDefault(); checkAuthAndStartGame('ANI'); }}
                disabled={isCheckingAuth}
                className="relative bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black font-bold text-lg h-20 rounded-2xl shadow-xl shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">🦁</span>
                  <span className="text-xs font-semibold">ANIMAIS</span>
                </div>
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </Button>

              {/* MÚSICA */}
              <Button
                onClick={(e) => { e.preventDefault(); checkAuthAndStartGame('MUS'); }}
                disabled={isCheckingAuth}
                className="relative bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black font-bold text-lg h-20 rounded-2xl shadow-xl shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">🎹</span>
                  <span className="text-xs font-semibold">MÚSICA</span>
                </div>
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </Button>

              {/* ESPAÇO */}
              <Button
                onClick={(e) => { e.preventDefault(); checkAuthAndStartGame('UNI'); }}
                disabled={isCheckingAuth}
                className="relative bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black font-bold text-lg h-20 rounded-2xl shadow-xl shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">🧑‍🚀</span>
                  <span className="text-xs font-semibold">ESPAÇO</span>
                </div>
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </Button>
            </div>
            
            {/* Status Message */}
            {isCheckingAuth && (
              <div className="text-center mt-4">
                <div className="flex items-center justify-center gap-2 text-white">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : gameState.phase === 'betting' && showBettingPanel ? (
        <div className="relative z-20">
          <BettingPanel 
            onClose={() => setShowBettingPanel(false)} 
            selectedTheme={selectedTheme || 'UNI'} 
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-2 sm:p-4 md:p-8 relative z-10 pt-20 pb-20 sm:pb-8 game-container">
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
            
            {/* Game Stats - Fixed above grid during gameplay */}
            {gameState.phase === 'playing' && (
              <div className="mb-4 sm:mb-6 relative z-20">
                <div className="glass-effect rounded-xl border border-yellow-500/30 shadow-xl shadow-yellow-500/20 animate-pulse-gentle">
                  <div className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between gap-1 sm:gap-3 md:gap-6">
                      <div className="text-center relative flex-1">
                        <div className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1 sm:mb-2">⏱️ TEMPO</div>
                        <div className={`text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 transition-all duration-300 ${
                          gameState.timeLeft <= 10 ? 'text-red-400 animate-bounce-gentle' : 'text-white'
                        }`}>
                          {gameState.timeLeft}s
                        </div>
                        <div className="relative">
                          <div className="w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-3 bg-gray-700/50 rounded-full mx-auto overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                gameState.timeLeft <= 10 ? 'bg-red-500' : 'bg-yellow-500'
                              }`}
                              style={{ 
                                width: `${(gameState.timeLeft / gameState.maxTime) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center relative flex-1">
                        <div className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1 sm:mb-2">🎯 JOGADAS</div>
                        <div className={`text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 transition-all duration-300 ${
                          gameState.movesLeft <= 5 ? 'text-red-400 animate-bounce-gentle' : 'text-white'
                        }`}>
                          {gameState.movesLeft}
                        </div>
                        <div className="relative">
                          <div className="w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-3 bg-gray-700/50 rounded-full mx-auto overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                gameState.movesLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                              style={{ 
                                width: `${(gameState.movesLeft / gameState.maxMoves) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center relative flex-1">
                        <div className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1 sm:mb-2">💰 PARES</div>
                        <div className="text-sm sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-green-400">
                          {gameState.matchedPairs}/{gameState.cards.length / 2}
                        </div>
                        <div className="relative">
                          <div className="w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-3 bg-gray-700/50 rounded-full mx-auto overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-500"
                              style={{ 
                                width: `${(gameState.matchedPairs / (gameState.cards.length / 2)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Cards Grid - Premium Version */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 p-2 sm:p-4 md:p-6 glass-effect from-slate-800/40 via-purple-800/40 to-slate-900/40 rounded-xl sm:rounded-2xl border border-yellow-500/30 shadow-2xl backdrop-blur-md select-none">
              {gameState.cards.map((card, index) => {
                const isCardBlocked = gameState.isBlocked && !card.isFlipped && !card.isMatched;
                const canClick = !card.isFlipped && !card.isMatched && gameState.phase === 'playing' && !gameState.isBlocked;
                
                return (
                  <div
                  key={index}
                  className={`aspect-square relative transition-all duration-500 transform ${
                    isCardBlocked 
                      ? 'cursor-not-allowed opacity-30 scale-95' 
                      : canClick 
                        ? 'cursor-pointer hover:scale-105' 
                        : 'cursor-default'
                  } ${
                    card.isFlipped || card.isMatched ? 'z-20' : 'z-10'
                  } group select-none memory-card`}
                  data-game-element="true"
                  onClick={() => {
                    if (canClick) {
                      handleCardClick(index);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDoubleClick={(e) => e.preventDefault()}
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  {/* Card Glow Effect */}
                  <div className={`absolute inset-0 rounded-lg sm:rounded-xl transition-all duration-500 ${
                    card.isMatched 
                      ? 'glass-effect from-yellow-400/40 via-yellow-500/30 to-orange-500/40 shadow-xl sm:shadow-2xl shadow-yellow-500/50 animate-pulse-slow' 
                      : card.isFlipped 
                        ? 'glass-effect from-blue-500/30 via-purple-500/30 to-blue-600/30 shadow-lg sm:shadow-xl shadow-blue-500/30' 
                        : 'glass-effect from-purple-800/50 via-purple-700/40 to-purple-900/50 shadow-md sm:shadow-lg group-hover:shadow-xl group-hover:shadow-yellow-400/20'
                  }`}></div>
                  
                  {/* Card Border */}
                  <div className={`absolute inset-0 rounded-lg sm:rounded-xl border-2 transition-all duration-500 ${
                    card.isMatched 
                      ? 'border-yellow-400 animate-pulse-border' 
                      : card.isFlipped 
                        ? 'border-blue-400' 
                        : 'border-purple-400/50 group-hover:border-yellow-400/80'
                  }`}></div>
                  
                  {/* Card Content */}
                  <div className="relative w-full h-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold z-10">
                    {card.isFlipped || card.isMatched ? (
                      <span className={`transition-all duration-300 ${
                        card.isMatched 
                          ? 'text-yellow-300 text-2xl sm:text-3xl md:text-4xl lg:text-5xl animate-bounce-gentle drop-shadow-lg' 
                          : 'text-white text-2xl sm:text-3xl md:text-4xl drop-shadow-md'
                      }`}>
                        {card.icon}
                      </span>
                    ) : (
                      <div className="relative">
                        <span className="text-yellow-400 text-xl sm:text-2xl md:text-3xl animate-pulse-gentle drop-shadow-lg">★</span>
                        <div className="absolute inset-0 animate-ping">
                          <span className="text-yellow-400/30 text-xl sm:text-2xl md:text-3xl">★</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Reflection */}
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-30"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay - Only show during gameplay */}
      {gameState.phase !== 'betting' && <GameUI />}
      
      {/* Result Modal */}
      {(gameState.phase === 'won' || gameState.phase === 'lost') && <ResultModal />}
    </div>
  );
}