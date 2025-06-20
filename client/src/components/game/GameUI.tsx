import { useEffect } from "react";
import { useMemoryGame } from "@/lib/stores/useMemoryGame";
import { useBalance } from "@/lib/stores/useBalance";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameSettings } from "@/lib/stores/useGameSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";

export default function GameUI() {
  const { gameState, resetGame } = useMemoryGame();
  const { balance } = useBalance();
  const { isMuted, toggleMute } = useAudio();
  const { maxTime, maxMoves, winMultiplier, fetchSettings } = useGameSettings();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const timeProgress = (gameState.timeLeft / gameState.maxTime) * 100;
  const movesProgress = (gameState.movesLeft / gameState.maxMoves) * 100;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top Bar - Mobile Responsive */}
      <div className="flex justify-between items-center p-2 sm:p-4 md:p-6">
        <div className="glass-effect rounded-xl sm:rounded-2xl border border-yellow-500/30 pointer-events-auto shadow-xl sm:shadow-2xl shadow-yellow-500/20">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="text-center relative">
                <div className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1 sm:mb-2">💰 SALDO</div>
                <div className="text-white text-lg sm:text-xl md:text-2xl font-bold gradient-text animate-shimmer">
                  R$ {(typeof balance === 'number' ? balance : 0).toFixed(2)}
                </div>
                <div className="absolute -top-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              
              {gameState.currentBet > 0 && (
                <div className="text-center border-l border-yellow-500/40 pl-3 sm:pl-4 md:pl-6 relative">
                  <div className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1 sm:mb-2">🎯 APOSTA</div>
                  <div className="text-white text-lg sm:text-xl md:text-2xl font-bold">
                    R$ {gameState.currentBet.toFixed(2)}
                  </div>
                  <div className="absolute -top-1 -left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <div className="glass-effect rounded-lg sm:rounded-xl border border-yellow-500/30 pointer-events-auto shadow-lg sm:shadow-xl hover:shadow-yellow-500/20 transition-all duration-300 group">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 p-2 sm:p-3 md:p-4 transition-all duration-300 group-hover:scale-110"
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            </Button>
          </div>
          
          <div className="glass-effect rounded-lg sm:rounded-xl border border-yellow-500/30 pointer-events-auto shadow-lg sm:shadow-xl hover:shadow-yellow-500/20 transition-all duration-300 group">
            <Button
              variant="ghost"
              size="icon"
              onClick={resetGame}
              className="text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 p-2 sm:p-3 md:p-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-180"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>
      </div>



      {/* Game Title - Mobile Responsive */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 sm:px-0">
        {gameState.phase === 'betting' && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-yellow-400/20 blur-2xl sm:blur-3xl animate-pulse-slow"></div>
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold gradient-text mb-4 sm:mb-6 tracking-wider drop-shadow-2xl animate-pulse-gentle">
                🎰 MEMORY CASINO
              </h1>
              <div className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-yellow-500/30 shadow-xl sm:shadow-2xl shadow-yellow-500/20 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto">
                <p className="text-white/90 text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-2">
                  ✨ Encontre os 8 pares e ganhe {winMultiplier}x sua aposta! ✨
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-8 text-yellow-400/80 text-sm sm:text-lg">
                  <span>⏱️ {gameState.maxTime} segundos</span>
                  <span>🎯 {gameState.maxMoves} movimentos</span>
                  <span>💰 {winMultiplier}x multiplicador</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
