import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { User } from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettings {
  siteName: string;
  logoLight?: string;
}

export default function MemoryGame() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showBettingPanel, setShowBettingPanel] = useState(false);

  // Load site settings
  useEffect(() => {
    fetch('/api/site-settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(() => {
        setSettings({
          siteName: 'Memória Premiada',
          logoLight: undefined
        });
      });
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/user/balance', {
          credentials: 'include'
        });
        setIsLoggedIn(response.ok);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  const checkAuthAndStartGame = async () => {
    setIsCheckingAuth(true);
    
    try {
      const response = await fetch('/api/user/balance', {
        credentials: 'include'
      });

      if (response.ok) {
        setIsCheckingAuth(false);
        setShowBettingPanel(true);
      } else {
        setIsCheckingAuth(false);
        toast.info('Entre em sua conta para Jogar', {
          duration: 4000,
          action: {
            label: "Fazer Login",
            onClick: () => window.location.href = '/login'
          }
        });
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
      }
    } catch (error) {
      setIsCheckingAuth(false);
      toast.error('Entre em sua conta para Jogar');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    }
  };

  // Demo cards for background
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

  if (showBettingPanel) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Painel de Apostas</h2>
            <p className="mb-4">Selecione o valor da sua aposta para começar</p>
            <Button
              onClick={() => setShowBettingPanel(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Navigation Button */}
      {isLoggedIn && (
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

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-gradient-x">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent"></div>
      </div>
      
      {/* Floating Casino Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-yellow-400/20 text-6xl animate-float">♠</div>
        <div className="absolute top-20 right-20 text-yellow-400/20 text-6xl animate-float-delayed">♥</div>
        <div className="absolute bottom-20 left-20 text-yellow-400/20 text-6xl animate-float">♦</div>
        <div className="absolute bottom-10 right-10 text-yellow-400/20 text-6xl animate-float-delayed">♣</div>
        <div className="absolute top-1/2 left-5 text-yellow-400/10 text-3xl animate-spin-slow">★</div>
        <div className="absolute top-1/3 right-5 text-yellow-400/10 text-3xl animate-spin-slow">★</div>
      </div>

      {/* Background Grid */}
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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-full relative z-10 p-4">
        {/* Logo Area */}
        <div className="text-center mb-8 sm:mb-12">
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
                  }}
                />
              </div>
            ) : (
              <div className="relative z-10 mx-auto mb-4">
                <h1 className="text-6xl sm:text-7xl md:text-8xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl">
                  {settings?.siteName || 'MEMÓRIA PREMIADA'}
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={checkAuthAndStartGame}
          disabled={isCheckingAuth}
          className="relative bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-700 text-black font-bold text-xl sm:text-2xl px-8 sm:px-12 py-4 sm:py-6 rounded-2xl shadow-xl shadow-yellow-500/50 hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="relative z-10 flex items-center gap-3">
            {isCheckingAuth ? (
              <>
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Verificando...</span>
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              <>
                <span className="text-2xl">🎰</span>
                <span>START</span>
                <span className="text-2xl">🎰</span>
              </>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-yellow-300/30 to-yellow-500/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Button>

        {/* Subtitle */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-yellow-200/80 text-lg sm:text-xl font-medium">
            Teste sua memória e ganhe prêmios incríveis!
          </p>
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-yellow-200/60 text-sm">
            Jogo de memória premiado • Apostas reais • Saques instantâneos
          </p>
        </div>
      </div>
    </div>
  );
}