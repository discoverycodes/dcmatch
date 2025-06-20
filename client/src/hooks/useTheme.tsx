import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.classList.remove('dark');
    body.classList.remove('dark');
    
    let shouldBeDark = false;
    
    if (newTheme === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else if (newTheme === 'dark') {
      shouldBeDark = true;
    }
    
    if (shouldBeDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    }
    
    // Apply to all containers
    const containers = document.querySelectorAll('.min-h-screen, .h-screen, .bg-gray-50, .bg-white');
    containers.forEach(container => {
      if (shouldBeDark) {
        container.classList.add('dark');
      } else {
        container.classList.remove('dark');
      }
    });
  };

  const setThemeWithPersistence = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return {
    theme,
    setTheme: setThemeWithPersistence,
    applyTheme
  };
}