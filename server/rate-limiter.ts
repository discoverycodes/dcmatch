import { Request, Response, NextFunction } from 'express';
import { LogSanitizer } from './log-sanitizer';

interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blocked: boolean;
}

class RateLimiter {
  private attempts = new Map<string, RateLimitRecord>();
  private readonly cleanupInterval = 60000; // 1 minuto

  constructor() {
    // Limpar registros antigos periodicamente
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, record] of this.attempts.entries()) {
      if (now - record.lastAttempt > oneHour) {
        this.attempts.delete(key);
      }
    }
  }

  private getKey(req: Request, type: string): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${type}:${ip}:${userAgent.slice(0, 50)}`;
  }

  createMiddleware(type: 'auth' | 'api' | 'payment', maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req, type);
      const now = Date.now();
      
      let record = this.attempts.get(key) || {
        attempts: 0,
        lastAttempt: 0,
        blocked: false
      };

      // Reset se janela de tempo expirou
      if (now - record.lastAttempt > windowMs) {
        record = { attempts: 0, lastAttempt: now, blocked: false };
      }

      // Verificar se está bloqueado
      if (record.blocked && (now - record.lastAttempt) < windowMs) {
        LogSanitizer.logAuth('RATE_LIMIT_EXCEEDED', req.ip || 'unknown');
        return res.status(429).json({ 
          error: 'Too many requests', 
          retryAfter: Math.ceil((windowMs - (now - record.lastAttempt)) / 1000)
        });
      }

      // Reset block se tempo expirou
      if (record.blocked && (now - record.lastAttempt) >= windowMs) {
        record.blocked = false;
        record.attempts = 0;
      }

      // Adicionar métodos ao request
      (req as any).rateLimit = {
        increment: () => {
          record.attempts++;
          record.lastAttempt = now;
          if (record.attempts >= maxAttempts) {
            record.blocked = true;
            LogSanitizer.logAuth('RATE_LIMIT_BLOCKED', req.ip || 'unknown');
          }
          this.attempts.set(key, record);
        },
        reset: () => {
          record.attempts = 0;
          record.blocked = false;
          this.attempts.set(key, record);
        }
      };

      next();
    };
  }
}

export const rateLimiter = new RateLimiter();