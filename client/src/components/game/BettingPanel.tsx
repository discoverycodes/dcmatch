import { useState, useEffect } from "react";
import { useMemoryGame } from "@/lib/stores/useMemoryGame";
import { useBalance } from "@/lib/stores/useBalance";
import { useGameSettings } from "@/lib/stores/useGameSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";

interface BettingPanelProps {
  onClose?: () => void;
  selectedTheme?: string;
}

export default function BettingPanel({ onClose, selectedTheme }: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState("10.00");
  const { startGame } = useMemoryGame();
  const { balance, updateBalance, fetchBalance, isAnimating, animatingAmount, previousBalance } = useBalance();
  const { minBet, maxBet, winMultiplier, maxTime, maxMoves, fetchSettings } = useGameSettings();

  useEffect(() => {
    fetchSettings();
    // Only fetch balance if there are session indicators
    const checkAuthAndFetchBalance = async () => {
      const userData = localStorage.getItem('user');
      const hasCookie = document.cookie.includes('memoria-premiada-session');
      
      if (!userData && !hasCookie) {
        return; // No session indicators, skip balance fetch
      }
      
      try {
        const userResponse = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        if (userResponse.ok) {
          fetchBalance();
        }
      } catch (error) {
        // User not authenticated, skip balance fetch
      }
    };
    checkAuthAndFetchBalance();
  }, [fetchSettings, fetchBalance]);

  const predefinedBets = [1, 2, 5, 10, 20, 50].filter(bet => bet <= maxBet);

  const handleStartGame = async () => {
    const bet = parseFloat(betAmount);
    
    if (isNaN(bet) || bet <= 0) {
      toast.error("Digite um valor válido para a aposta");
      return;
    }
    
    if (bet < minBet) {
      toast.error(`Aposta mínima: R$ ${minBet.toFixed(2)}`);
      return;
    }
    
    if (bet > maxBet) {
      toast.error(`Aposta máxima: R$ ${maxBet.toFixed(2)}`);
      return;
    }
    
    if (bet > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    try {
      // Update balance with current bet (optimistic update)
      updateBalance(balance - bet);
      
      // Start the game (this will handle the server communication)
      await startGame(bet, undefined, selectedTheme);
      
      toast.success(`Jogo iniciado! Aposta: R$ ${bet.toFixed(2)}`);
    } catch (error) {
      // Revert balance on error
      updateBalance(balance);
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar o jogo");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none p-2 sm:p-4">
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        {/* Background Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-yellow-400/20 blur-xl sm:blur-2xl md:blur-3xl animate-pulse-slow"></div>
        
        <div className="glass-effect rounded-xl sm:rounded-2xl md:rounded-3xl border-2 border-yellow-500/50 pointer-events-auto shadow-xl sm:shadow-2xl shadow-yellow-500/20 relative z-10">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 hover:border-red-400 transition-all duration-300 group"
              title="Fechar"
            >
              <X className="w-4 h-4 text-red-400 group-hover:text-red-300" />
            </button>
          )}
          
          <div className="p-3 sm:p-4 md:p-5 lg:p-6">
            {/* Header */}
            <div className="text-center mb-3 sm:mb-4 relative">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-2 sm:mb-3 tracking-wider">
                FAÇA SUA APOSTA
              </h2>
              <div className="glass-effect rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/30 relative overflow-hidden">
                <p className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-1">SALDO DISPONÍVEL</p>
                <div className="relative">
                  <p className="text-white text-xl sm:text-2xl font-bold gradient-text">
                    R$ {(typeof balance === 'number' ? balance : 0).toFixed(2)}
                  </p>
                  
                  {/* Win Animation Overlay */}
                  {isAnimating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-green-500/90 rounded-lg px-3 py-2 border-2 border-yellow-400 animate-bounce">
                        <div className="text-yellow-300 text-sm font-bold">
                          +R$ {animatingAmount.toFixed(2)} 🎉
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Confetti particles when animating */}
                {isAnimating && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1 left-1 text-yellow-400 animate-bounce animation-delay-100">✨</div>
                    <div className="absolute top-1 right-1 text-green-400 animate-bounce animation-delay-200">💰</div>
                    <div className="absolute bottom-1 left-1 text-yellow-300 animate-bounce animation-delay-300">🎊</div>
                    <div className="absolute bottom-1 right-1 text-green-300 animate-bounce animation-delay-400">⭐</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Predefined Bet Buttons */}
            <div className="mb-3 sm:mb-4">
              <p className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-2 sm:mb-3 text-center">APOSTAS RÁPIDAS</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {predefinedBets.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount.toFixed(2))}
                    disabled={amount > (typeof balance === 'number' ? balance : 0)}
                    className={`
                      relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 font-bold text-sm sm:text-lg group
                      ${betAmount === amount.toString() + ".00" 
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 text-black shadow-lg shadow-yellow-500/50 scale-105' 
                        : 'glass-effect border-yellow-500/30 text-yellow-400 hover:border-yellow-400 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20'
                      }
                      ${amount > (typeof balance === 'number' ? balance : 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="relative z-10">R$ {amount}</div>
                    {betAmount === amount.toString() + ".00" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg sm:rounded-xl"></div>
                    )}
                    {amount <= (typeof balance === 'number' ? balance : 0) && (
                      <div className="absolute inset-0 animate-shimmer rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Bet Input */}
            <div className="mb-3 sm:mb-4">
              <label className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-2 sm:mb-3 block text-center">
                💎 VALOR PERSONALIZADO
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={typeof balance === 'number' ? balance : 0}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="glass-effect border-yellow-500/50 text-white text-center text-lg sm:text-xl font-bold h-12 sm:h-14 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                  placeholder="0.00"
                />
                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-yellow-400 font-bold text-sm sm:text-base">
                  R$
                </div>
              </div>
            </div>
            
            {/* Start Game Button */}
            <div className="mb-3 sm:mb-4">
              <button
                onClick={handleStartGame}
                disabled={parseFloat(betAmount) > (typeof balance === 'number' ? balance : 0) || parseFloat(betAmount) <= 0}
                className={`
                  w-full h-12 sm:h-16 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 relative overflow-hidden group
                  ${parseFloat(betAmount) > (typeof balance === 'number' ? balance : 0) || parseFloat(betAmount) <= 0
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black shadow-xl sm:shadow-2xl shadow-yellow-500/50 hover:scale-105 hover:shadow-yellow-500/70 cursor-pointer'
                  }
                `}
              >
                <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                  <span className="text-lg sm:text-2xl">🎰</span>
                  <span>JOGAR - R$ {parseFloat(betAmount || "0").toFixed(2)}</span>
                  <span className="text-lg sm:text-2xl">🎰</span>
                </div>
                {parseFloat(betAmount) <= (typeof balance === 'number' ? balance : 0) && parseFloat(betAmount) > 0 && (
                  <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            </div>
            
            {/* Potential Win Display */}
            {parseFloat(betAmount) > 0 && (
              <div className="glass-effect rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/30 mb-3 sm:mb-4">
                <p className="text-green-400 text-xs sm:text-sm font-bold tracking-wider mb-2 text-center">💰 GANHO POTENCIAL</p>
                <div className="text-center">
                  <div className="text-green-300 text-lg sm:text-xl font-bold">
                    R$ {(parseFloat(betAmount || "0") * winMultiplier).toFixed(2)}
                  </div>
                  <div className="text-green-400/80 text-xs sm:text-sm mt-1">
                    ({winMultiplier}x multiplicador)
                  </div>
                </div>
              </div>
            )}
            
            {/* Game Rules */}
            <div className="glass-effect rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/30">
              <p className="text-yellow-400 text-xs sm:text-sm font-bold tracking-wider mb-2 sm:mb-3 text-center">🎯 REGRAS DO JOGO</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-white/80 text-xs sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-green-400">✓</span>
                  <span>8 pares para vitória</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-blue-400">⏱️</span>
                  <span>{maxTime} segundos</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-orange-400">🎯</span>
                  <span>{maxMoves} movimentos</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-yellow-400">💰</span>
                  <span>{winMultiplier}x multiplicador</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
