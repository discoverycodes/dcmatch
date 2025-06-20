import { useState, useEffect } from 'react';

interface SiteSettings {
  id: number;
  siteName: string;
  favicon: string | null;
  logoLight: string | null;
  logoDark: string | null;
  primaryColor: string;
  theme: string;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/site-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Fallback settings if API fails
        setSettings({
          id: 1,
          siteName: 'Memory Casino',
          favicon: null,
          logoLight: null,
          logoDark: null,
          primaryColor: '#6366f1',
          theme: 'light'
        });
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
      // Fallback settings
      setSettings({
        id: 1,
        siteName: 'Memory Casino',
        favicon: null,
        logoLight: null,
        logoDark: null,
        primaryColor: '#6366f1',
        theme: 'light'
      });
    }
    setLoading(false);
  };

  return { settings, loading };
}