import { useMemoryGame } from "@/lib/stores/useMemoryGame";
import { useBalance } from "@/lib/stores/useBalance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, X, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

export default function ResultModal() {
  const { gameState, resetGame } = useMemoryGame();
  const { balance, animateWin } = useBalance();
  const [gameSettings, setGameSettings] = useState<any>(null);
  
  useEffect(() => {
    const fetchGameSettings = async () => {
      try {
        const response = await fetch('/api/game-settings');
        if (response.ok) {
          const settings = await response.json();
          setGameSettings(settings);
        }
      } catch (error) {
        console.error('Failed to fetch game settings:', error);
      }
    };
    
    fetchGameSettings();
  }, []);
  
  const isWin = gameState.phase === 'won';
  const winMultiplier = gameSettings?.winMultiplier || 2.5;
  const winAmount = isWin ? gameState.currentBet * winMultiplier : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-30 bg-black/70 backdrop-blur-md p-4">
      <div className="relative animate-in zoom-in-95 duration-500 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        {/* Background Glow Effect */}
        <div className={`absolute inset-0 blur-2xl sm:blur-3xl md:blur-4xl animate-pulse-slow ${
          isWin 
            ? 'bg-gradient-to-r from-yellow-400/30 via-green-500/40 to-yellow-400/30' 
            : 'bg-gradient-to-r from-red-400/30 via-red-500/40 to-red-400/30'
        }`}></div>
        
        <div className={`glass-effect rounded-2xl sm:rounded-3xl border-2 relative z-10 shadow-xl sm:shadow-2xl ${
          isWin 
            ? 'border-yellow-500/50 shadow-yellow-500/30' 
            : 'border-red-500/50 shadow-red-500/30'
        }`}>
          <div className="p-4 sm:p-6 md:p-6 lg:p-8">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8 md:mb-10">
              {isWin && (
                <div className="mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl shadow-yellow-500/50 animate-bounce-gentle">
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                  </div>
                </div>
              )}
              
              <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 tracking-wider ${
                isWin ? 'gradient-text' : 'text-red-400'
              }`}>
                {isWin ? '🎉 PARABÉNS! 🎉' : '💥 GAME OVER 💥'}
              </h2>
              
              <p className={`text-lg sm:text-xl font-semibold ${
                isWin ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {isWin 
                  ? '✨ Você encontrou todos os pares! ✨' 
                  : '⏰ Tempo esgotado ou movimentos insuficientes'
                }
              </p>
            </div>
            

            {/* Win/Loss Amount */}
            <div className={`relative p-4 sm:p-6 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 md:mb-6 border-2 ${
              isWin 
                ? 'bg-gradient-to-br from-green-500/20 via-yellow-500/20 to-green-500/20 border-yellow-400' 
                : 'bg-gradient-to-br from-red-500/20 via-red-600/20 to-red-500/20 border-red-400'
            }`}>
              <div className="text-center">
                <div className="text-white/90 text-base sm:text-lg md:text-xl lg:text-xl font-bold mb-2 md:mb-3">
                  {isWin ? '🎊 VOCÊ GANHOU 🎊' : '💸 VOCÊ PERDEU 💸'}
                </div>
                <div className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-bold ${
                  isWin ? 'gradient-text animate-pulse-gentle' : 'text-red-400'
                }`}>
                  {isWin ? '+' : '-'}R$ {(isWin ? winAmount : gameState.currentBet).toFixed(2)}
                </div>
                {isWin && (
                  <div className="text-yellow-300 text-base sm:text-lg md:text-xl lg:text-xl mt-2 md:mt-3 font-semibold">
                    ⭐ {winMultiplier}x MULTIPLICADOR ⭐
                  </div>
                )}
              </div>
              
              {/* Animated particles for win */}
              {isWin && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl sm:rounded-2xl">
                  <div className="absolute top-2 left-4 text-yellow-400 animate-bounce-gentle animation-delay-100">✨</div>
                  <div className="absolute top-4 right-6 text-yellow-300 animate-bounce-gentle animation-delay-200">⭐</div>
                  <div className="absolute bottom-4 left-6 text-yellow-400 animate-bounce-gentle animation-delay-300">💎</div>
                  <div className="absolute bottom-2 right-4 text-yellow-300 animate-bounce-gentle animation-delay-400">🎉</div>
                </div>
              )}
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => {
                if (isWin) {
                  // Calculate previous balance (current balance minus win amount)
                  const prevBalance = balance - winAmount;
                  animateWin(winAmount, prevBalance);
                }
                resetGame();
              }}
              className="w-full h-12 sm:h-16 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white shadow-xl sm:shadow-2xl shadow-blue-500/50 hover:scale-105 hover:shadow-blue-500/70"
            >
              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-180 transition-transform duration-300" />
                <span>🎰 JOGAR NOVAMENTE 🎰</span>
              </div>
              <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
