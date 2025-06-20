import { useState } from 'react';
import { Button } from '../ui/button';
import { User } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  icon: string;
}

const GAME_THEMES: Theme[] = [
  { id: 'ESP', name: 'ESPORTES', icon: '⚽' },
  { id: 'ANI', name: 'ANIMAIS', icon: '🦁' },
  { id: 'MUS', name: 'MÚSICA', icon: '🎹' },
  { id: 'VARI', name: 'VARIEDADES', icon: '🌍' }
];

interface ThemeSelectorProps {
  onThemeSelect: (themeId: string) => void;
  isLoggedIn: boolean;
  onLoginRedirect: () => void;
}

export default function ThemeSelector({ onThemeSelect, isLoggedIn, onLoginRedirect }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const handleThemeClick = (themeId: string) => {
    if (!isLoggedIn) {
      onLoginRedirect();
      return;
    }
    
    setSelectedTheme(themeId);
    onThemeSelect(themeId);
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Escolha seu Estilo de Jogo</h2>
        <p className="text-gray-300">Selecione um tema para começar a jogar</p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-md">
        {GAME_THEMES.map((theme) => (
          <Button
            key={theme.id}
            onClick={() => handleThemeClick(theme.id)}
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
  );
}