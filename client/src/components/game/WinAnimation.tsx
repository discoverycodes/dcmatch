import { useEffect, useState } from "react";
import { useBalance } from "@/lib/stores/useBalance";

interface WinAnimationProps {
  winAmount: number;
  previousBalance: number;
  newBalance: number;
}

export default function WinAnimation({ winAmount, previousBalance, newBalance }: WinAnimationProps) {
  const [animatedBalance, setAnimatedBalance] = useState(previousBalance);
  const [showConfetti, setShowConfetti] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate random particles for confetti effect
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2000,
    }));
    setParticles(newParticles);

    // Animate balance counting up
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = (newBalance - previousBalance) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const currentValue = previousBalance + (increment * currentStep);
      
      if (currentStep >= steps) {
        setAnimatedBalance(newBalance);
        clearInterval(timer);
        setTimeout(() => setShowConfetti(false), 1000);
      } else {
        setAnimatedBalance(currentValue);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [winAmount, previousBalance, newBalance]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-3 h-3 animate-bounce"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}ms`,
                animationDuration: '1500ms',
              }}
            >
              {Math.random() > 0.5 ? '💰' : Math.random() > 0.5 ? '✨' : '🎉'}
            </div>
          ))}
        </div>
      )}

      {/* Main Animation Container */}
      <div className="relative bg-black/80 backdrop-blur-lg rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50 animate-pulse-gentle">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-green-500/40 to-yellow-400/30 blur-2xl animate-pulse rounded-3xl"></div>
        
        <div className="relative z-10 text-center">
          {/* Win Amount Display */}
          <div className="mb-6">
            <div className="text-yellow-300 text-2xl font-bold mb-2 animate-bounce">
              🏆 VOCÊ GANHOU! 🏆
            </div>
            <div className="text-green-400 text-6xl font-black animate-pulse-gentle">
              +R$ {winAmount.toFixed(2)}
            </div>
          </div>

          {/* Balance Animation */}
          <div className="bg-gradient-to-r from-blue-600/50 to-purple-600/50 rounded-2xl p-6 border-2 border-blue-400">
            <div className="text-white text-xl mb-2">💳 SEU SALDO:</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-gray-300 text-3xl line-through">
                R$ {previousBalance.toFixed(2)}
              </div>
              <div className="text-4xl animate-bounce">➜</div>
              <div className="text-green-400 text-4xl font-bold animate-pulse">
                R$ {animatedBalance.toFixed(2)}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-green-500 transition-all duration-2000 ease-out"
                style={{ 
                  width: `${((animatedBalance - previousBalance) / (newBalance - previousBalance)) * 100}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Animated Elements */}
          <div className="mt-6 flex justify-center gap-4">
            <div className="text-4xl animate-spin-slow">💎</div>
            <div className="text-4xl animate-bounce animation-delay-100">🎊</div>
            <div className="text-4xl animate-pulse animation-delay-200">⭐</div>
            <div className="text-4xl animate-bounce animation-delay-300">🎯</div>
            <div className="text-4xl animate-spin-slow animation-delay-400">💰</div>
          </div>
        </div>
      </div>
    </div>
  );
}