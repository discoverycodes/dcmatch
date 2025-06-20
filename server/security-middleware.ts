import { Request, Response, NextFunction } from 'express';
import { LogSanitizer } from './log-sanitizer';

/**
 * Security middleware to protect sensitive files and endpoints
 */

export function protectSensitiveFiles(req: Request, res: Response, next: NextFunction) {
  // Only block direct .env file access, nothing else
  if (req.url === '/.env' || req.url === '.env' || req.path === '/.env') {
    LogSanitizer.logAuth('ENV_ACCESS_BLOCKED', req.ip || 'unknown');
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Block access to sensitive configuration files
  const sensitiveFiles = [
    'config.json',
    'secrets.json',
    'package.json',
    'tsconfig.json',
    'drizzle.config',
    'database.json'
  ];
  
  // Block access to configuration directories
  const sensitiveDirectories = [
    '/config/',
    '/secrets/',
    '/credentials/',
    '/.git/',
    '/node_modules/',
    '/server/',
    '/database/',
    '/.vscode/',
    '/.idea/'
  ];
  
  // Check for sensitive file access
  for (const file of sensitiveFiles) {
    if (url.includes(file) || originalUrl.includes(file)) {
      LogSanitizer.logAuth('BLOCKED_CONFIG_ACCESS', req.ip || 'unknown');
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  // Check for sensitive directory access
  for (const dir of sensitiveDirectories) {
    if (path.startsWith(dir) || originalUrl.startsWith(dir)) {
      LogSanitizer.logAuth('BLOCKED_DIR_ACCESS', req.ip || 'unknown');
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  // Block common attack patterns and directory traversal
  const attackPatterns = [
    '../',
    '..\\',
    '/etc/',
    '/var/',
    '/root/',
    '/home/',
    'passwd',
    'shadow',
    'hosts',
    'proc/self/environ',
    '%2e%2e',
    '%2f',
    '%5c'
  ];
  
  for (const pattern of attackPatterns) {
    if (url.includes(pattern) || originalUrl.includes(pattern)) {
      LogSanitizer.logAuth('BLOCKED_ATTACK_PATTERN', req.ip || 'unknown');
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  next();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Simple rate limiting for sensitive endpoints
  const ip = req.ip || 'unknown';
  const sensitiveEndpoints = ['/api/admin', '/api/auth', '/api/payment'];
  
  if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    // In production, implement proper rate limiting with Redis
    // For now, just log attempts
    LogSanitizer.logAuth('SENSITIVE_ENDPOINT_ACCESS', ip);
  }
  
  next();
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove potentially revealing headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}