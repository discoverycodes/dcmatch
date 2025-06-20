import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BalanceState {
  balance: number;
  isAnimating: boolean;
  animatingAmount: number;
  previousBalance: number;
  setBalance: (balance: number) => void;
  updateBalance: (newBalance: number) => void;
  animateWin: (winAmount: number, newBalance: number) => void;
  fetchBalance: () => Promise<void>;
}

export const useBalance = create<BalanceState>()((set, get) => ({
  balance: 0.00, // Always start with zero and fetch from server
  isAnimating: false,
  animatingAmount: 0,
  previousBalance: 0,

  setBalance: (balance: number) => {
    set({ balance });
  },

  updateBalance: (newBalance: number) => {
    set({ balance: Math.max(0, newBalance) });
  },

  animateWin: (winAmount: number, newBalance: number) => {
    const currentBalance = get().balance;
    set({ 
      isAnimating: true, 
      animatingAmount: winAmount,
      previousBalance: currentBalance,
      balance: newBalance
    });
    
    // Stop animation after 3 seconds
    setTimeout(() => {
      set({ 
        isAnimating: false, 
        animatingAmount: 0,
        previousBalance: 0
      });
    }, 3000);
  },

  fetchBalance: async () => {
    try {
      // Check if there's any indication of active session before making API calls
      const userData = localStorage.getItem('user');
      const hasCookie = document.cookie.includes('memoria-premiada-session');
      
      if (!userData && !hasCookie) {
        // No session indicators, don't make API calls
        return;
      }

      // Check if user is authenticated before making the request
      const userResponse = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        // User not authenticated, don't fetch balance
        return;
      }

      const response = await fetch('/api/user/balance', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ balance: parseFloat(data.balance) || 0 });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // Keep current balance on error
    }
  },
}));
