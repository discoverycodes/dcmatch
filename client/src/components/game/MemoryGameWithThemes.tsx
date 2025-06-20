import React, { useState, useEffect } from 'react';
import { useMemoryGame } from '../../lib/stores/useMemoryGame';
import { useAudio } from '../../lib/stores/useAudio';
import { Button } from '../ui/button';
import { User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import GameUI from './GameUI';
import BettingPanel from './BettingPanel';
import ResultModal from './ResultModal';

interface Theme {
  id: string;
  name: string;
  icon: string;
}

const GAME_THEMES: Theme[] = [
  { id: 'ESP', name: 'ESPORTES', icon: '⚽' },
  { id: 'ANI', name: 'ANIMAIS', icon: '🦁' },
  { id: 'MUS', name: 'MÚSICA', icon: '🎹' },
  { id: 'UNI', name: 'ESPAÇO', icon: '🌍' }
];

export default function MemoryGameWithThemes() {
  const { gameState, flipCard } = useMemoryGame();
  const { playHit, initializeAudio, isInitialized } = useAudio();
  const [showBettingPanel, setShowBettingPanel] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const handleCardClick = (index: number) => {
    if (gameState.phase !== 'playing') return;

    playHit();
    flipCard(index);
  };

  // Initialize audio and check auth status
  useEffect(() => {
    if (!isInitialized) {
      initializeAudio();
    }
    
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
  }, [initializeAudio, isInitialized]);

  const handleThemeSelect = (themeId: string) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    
    setSelectedTheme(themeId);
    setShowBettingPanel(true);
  };

  const handleStartGame = async (betAmount: number) => {
    if (!selectedTheme) {
      toast.error('Selecione um tema primeiro');
      return;
    }

    try {
      const response = await fetch('/api/game/memory/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          betAmount,
          theme: selectedTheme
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao iniciar jogo');
      }

      const data = await response.json();
      console.log('Game started successfully:', data);
      
      setShowBettingPanel(false);
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar jogo');
    }
  };

  const handleBackToThemes = () => {
    setSelectedTheme(null);
    setShowBettingPanel(false);
  };

  const handleGameEnd = () => {
    setSelectedTheme(null);
  };

  // Show theme selector when no theme selected
  if (!selectedTheme && gameState.phase === 'betting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 
                      flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Escolha seu Estilo de Jogo</h2>
            <p className="text-gray-300">Selecione um tema para começar a jogar</p>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-md">
            {GAME_THEMES.map((theme) => (
              <Button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className="h-24 w-32 flex flex-col items-center justify-center space-y-2 
                           bg-gradient-to-br from-blue-600 to-purple-700 
                           hover:from-blue-500 hover:to-purple-600 
                           text-white border-2 border-white/20 
                           transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <span className="text-2xl">{theme.icon}</span>
                <span className="text-xs font-semibold">{theme.name}</span>
              </Button>
            ))}
          </div>

          {!isLoggedIn && (
            <div className="flex items-center space-x-2 text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-lg border border-yellow-400/20">
              <User className="w-4 h-4" />
              <span className="text-sm">Faça login para jogar</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 
                    flex flex-col items-center justify-center p-4 relative">
      
      {/* Header com tema selecionado */}
      {selectedTheme && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <Button
            onClick={handleBackToThemes}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Temas
          </Button>
          <div className="text-white text-sm">
            Tema: <span className="font-semibold">{selectedTheme}</span>
          </div>
        </div>
      )}

      {/* Game UI */}
      <GameUI />

      {/* Betting Panel */}
      {showBettingPanel && (
        <BettingPanel 
          onStart={handleStartGame}
          onClose={handleBackToThemes}
        />
      )}

      {/* Result Modal */}
      <ResultModal onClose={handleGameEnd} />
    </div>
  );
}