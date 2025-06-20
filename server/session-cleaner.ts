/**
 * SISTEMA DE LIMPEZA GLOBAL DE SESSÕES
 * Força invalidação de todas as sessões ativas para garantir sessão única
 */

import { storage } from './database-storage';

class SessionCleaner {
  private static instance: SessionCleaner;
  private globalSessionStore = new Map<number, string>(); // userId -> sessionId

  static getInstance(): SessionCleaner {
    if (!SessionCleaner.instance) {
      SessionCleaner.instance = new SessionCleaner();
    }
    return SessionCleaner.instance;
  }

  /**
   * Registra nova sessão e invalida todas as anteriores
   */
  async registerNewSession(userId: number, sessionId: string): Promise<void> {
    console.log(`[SESSION CLEANER] Registering new session for user ${userId}: ${sessionId}`);
    
    // Limpar sessão anterior se existir
    const previousSession = this.globalSessionStore.get(userId);
    if (previousSession && previousSession !== sessionId) {
      console.log(`[SESSION CLEANER] Invalidating previous session: ${previousSession}`);
    }
    
    // Registrar nova sessão
    this.globalSessionStore.set(userId, sessionId);
    
    // Atualizar no banco de dados
    await storage.updateUser(userId, {
      activeSessionId: sessionId,
      sessionTimestamp: Date.now(),
      lastLoginAt: new Date()
    });
  }

  /**
   * Verifica se a sessão é válida
   */
  isValidSession(userId: number, sessionId: string): boolean {
    const activeSession = this.globalSessionStore.get(userId);
    const isValid = activeSession === sessionId;
    
    if (!isValid) {
      console.warn(`[SESSION CLEANER] Invalid session for user ${userId} - Current: ${sessionId}, Active: ${activeSession}`);
    }
    
    return isValid;
  }

  /**
   * Remove sessão do usuário
   */
  removeSession(userId: number): void {
    console.log(`[SESSION CLEANER] Removing session for user ${userId}`);
    this.globalSessionStore.delete(userId);
  }

  /**
   * Limpa todas as sessões (emergência)
   */
  clearAllSessions(): void {
    console.log(`[SESSION CLEANER] EMERGENCY: Clearing all sessions`);
    this.globalSessionStore.clear();
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions(): Map<number, string> {
    return new Map(this.globalSessionStore);
  }

  /**
   * Estatísticas das sessões
   */
  getStats(): { totalSessions: number; activeSessions: Array<{userId: number, sessionId: string}> } {
    const activeSessions = Array.from(this.globalSessionStore.entries()).map(([userId, sessionId]) => ({
      userId,
      sessionId
    }));
    
    return {
      totalSessions: this.globalSessionStore.size,
      activeSessions
    };
  }
}

export const sessionCleaner = SessionCleaner.getInstance();