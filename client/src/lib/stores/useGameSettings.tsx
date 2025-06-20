import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GameSettings {
  maxTime: number;
  maxMoves: number;
  winMultiplier: number;
  minBet: number;
  maxBet: number;
}

interface GameSettingsState extends GameSettings {
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => void;
}

export const useGameSettings = create<GameSettingsState>()((set, get) => ({
  // Default settings (fallback only)
  maxTime: 45,
  maxMoves: 25,
  winMultiplier: 2.5,
  minBet: 2,
  maxBet: 2000,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/game-settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const settings = await response.json();
        set({
          ...settings,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch game settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: (newSettings: Partial<GameSettings>) => {
    set((state) => ({
      ...state,
      ...newSettings
    }));
  },
}));