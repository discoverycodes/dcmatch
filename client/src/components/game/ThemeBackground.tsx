import React from 'react';

interface ThemeBackgroundProps {
  theme: string;
}

export function ThemeBackground({ theme }: ThemeBackgroundProps) {
  if (theme === 'ESP') {
    // Background especial para tema Esportes (estádio)
    return (
      <>
        {/* Stadium Background for Sports Theme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Stadium Image Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
            style={{
              backgroundImage: 'url(/sports-background.jpg)',
              filter: 'blur(1px)'
            }}
          ></div>
          
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"></div>
        </div>
      </>
    );
  }
  
  if (theme === 'ANI') {
    // Background especial para tema Animais (floresta)
    return (
      <>
        {/* Forest Background for Animals Theme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Forest Image Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{
              backgroundImage: 'url(/forest-background.jpg)'
            }}
          ></div>
          
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30"></div>

          {/* Additional forest ambiance */}
          <div className="absolute top-1/4 left-[20%] w-2 h-2 bg-yellow-400/60 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-1/3 right-[25%] w-1.5 h-1.5 bg-yellow-300/50 rounded-full animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        </div>
      </>
    );
  }
  
  if (theme === 'MUS') {
    // Background especial para tema Música (concerto)
    return (
      <>
        {/* Concert Background for Music Theme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Concert Image Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
            style={{
              backgroundImage: 'url(/music-background.jpg)'
            }}
          ></div>
          
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"></div>
        </div>
      </>
    );
  }
  
  if (theme === 'UNI') {
    // Background especial para tema Universo
    return (
      <>
        {/* Universe Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Universe Image Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
            style={{
              backgroundImage: 'url(/universe-background.jpg)'
            }}
          ></div>
          
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"></div>
        </div>
      </>
    );
  }
  
  // Para outros temas, mantém o background original
  return (
    <>
      {/* Floating Symbols - Original */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Enhanced floating symbols with improved animations */}
        {Array.from({ length: 25 }).map((_, i) => {
          const symbols = ['💎', '✨', '🎯', '🎪', '🎭', '🎨', '⭐', '💫'];
          const symbol = symbols[i % symbols.length];
          const animationDelay = Math.random() * 10;
          const animationDuration = 15 + Math.random() * 10;
          const xPosition = Math.random() * 100;
          const size = 0.8 + Math.random() * 0.4;
          
          return (
            <div
              key={i}
              className="absolute opacity-20 select-none animate-float-slow"
              style={{
                left: `${xPosition}%`,
                animationDelay: `${animationDelay}s`,
                animationDuration: `${animationDuration}s`,
                transform: `scale(${size})`,
                fontSize: '1.5rem'
              }}
            >
              {symbol}
            </div>
          );
        })}
      </div>
    </>
  );
}