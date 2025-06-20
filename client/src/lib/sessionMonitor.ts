/**
 * MONITOR DE SESSÃO ÚNICA
 * Força logout automático quando detecta login em outro dispositivo/aba
 */

import { toast } from "sonner";

class SessionMonitor {
  private static instance: SessionMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;

  static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor();
    }
    return SessionMonitor.instance;
  }

  /**
   * Inicia monitoramento de sessão única
   */
  startMonitoring(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('[SESSION MONITOR] Starting session monitoring');
    
    // Verificar sessão a cada 5 segundos
    this.intervalId = setInterval(async () => {
      await this.checkSession();
    }, 5000);
    
    // Verificação imediata
    this.checkSession();
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    console.log('[SESSION MONITOR] Stopped session monitoring');
  }

  /**
   * Verifica se a sessão ainda é válida
   */
  private async checkSession(): Promise<void> {
    try {
      const response = await fetch('/api/user/balance', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.status === 401) {
        const errorData = await response.json();
        
        if (errorData.code === 'CONCURRENT_LOGIN' || errorData.code === 'SESSION_EXPIRED') {
          console.warn('[SESSION MONITOR] Session invalidated by concurrent login');
          this.handleSessionInvalidated();
        } else if (errorData.code === 'NO_SESSION') {
          console.warn('[SESSION MONITOR] No valid session found');
          this.handleSessionInvalidated();
        }
      }
    } catch (error) {
      console.error('[SESSION MONITOR] Error checking session:', error);
    }
  }

  /**
   * Manipula invalidação de sessão
   */
  private handleSessionInvalidated(): void {
    this.stopMonitoring();
    
    // Limpar dados locais
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Mostrar notificação elegante
    toast.error('Sessão Encerrada', {
      description: 'Sua sessão foi encerrada porque você fez login em outro dispositivo ou aba.',
      duration: 5000,
      action: {
        label: 'Fazer Login',
        onClick: () => window.location.href = '/login'
      }
    });
    
    // Redirecionar para login após delay
    setTimeout(() => {
      window.location.href = '/login?message=session_expired';
    }, 3000);
  }

  /**
   * Verifica se está monitorando
   */
  isMonitoring(): boolean {
    return this.isActive;
  }
}

export const sessionMonitor = SessionMonitor.getInstance();