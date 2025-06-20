import { create } from "zustand";
import { audioGenerator } from "../audioGenerator";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  gameOverSound: HTMLAudioElement | null;
  victorySound: HTMLAudioElement | null;
  isMuted: boolean;
  isInitialized: boolean;
  
  // Initialization
  initializeAudio: () => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playGameOver: () => void;
  playVictory: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  gameOverSound: null,
  victorySound: null,
  isMuted: true, // Start muted by default
  isInitialized: false,
  
  initializeAudio: async () => {
    if (get().isInitialized) return;
    
    try {
      // Initialize background music
      const backgroundMusic = new Audio('/sounds/background.mp3');
      backgroundMusic.loop = true;
      backgroundMusic.volume = 0.3;
      backgroundMusic.preload = 'auto';
      
      // Initialize hit sound
      const hitSound = new Audio('/sounds/hit.mp3');
      hitSound.volume = 0.5;
      hitSound.preload = 'auto';
      
      // Initialize success sound
      const successSound = new Audio('/sounds/success.mp3');
      successSound.volume = 0.7;
      successSound.preload = 'auto';
      
      // Initialize game over sound
      const gameOverSound = new Audio('/sounds/gameover.mp3');
      gameOverSound.volume = 0.6;
      gameOverSound.preload = 'auto';
      
      // Initialize victory sound  
      const victorySound = new Audio('/sounds/victory.mp3');
      victorySound.volume = 0.7;
      victorySound.preload = 'auto';
      
      set({ 
        backgroundMusic, 
        hitSound, 
        successSound,
        gameOverSound,
        victorySound,
        isInitialized: true 
      });
      
      console.log('Audio system initialized');
      
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  },
  
  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    
    set({ isMuted: newMutedState });
    
    // Control background music based on mute state
    if (backgroundMusic) {
      if (newMutedState) {
        backgroundMusic.pause();
        console.log('Background music paused');
      } else {
        backgroundMusic.play().then(() => {
          console.log('Background music started playing');
        }).catch(error => {
          console.log('Background music play prevented:', error);
        });
      }
    }
    
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },

  playBackgroundMusic: () => {
    const { backgroundMusic, isMuted } = get();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
  },

  stopBackgroundMusic: () => {
    const { backgroundMusic } = get();
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound && !isMuted) {
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      successSound.volume = 0.7;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },

  playGameOver: () => {
    const { gameOverSound, isMuted } = get();
    if (gameOverSound && !isMuted) {
      gameOverSound.currentTime = 0;
      gameOverSound.play().then(() => {
        console.log("Game over sound played");
      }).catch(error => {
        console.log("Game over sound play prevented:", error);
      });
    }
  },

  playVictory: () => {
    const { victorySound, isMuted } = get();
    if (victorySound && !isMuted) {
      victorySound.currentTime = 0;
      victorySound.play().then(() => {
        console.log("Victory sound played");
      }).catch(error => {
        console.log("Victory sound play prevented:", error);
      });
    }
  }
}));