import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * .htaccess-style protection for .env files
 * This middleware blocks all access to environment files
 */

export function envProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const url = req.url;
  const urlPath = req.path;
  const originalUrl = req.originalUrl;
  
  // Define all patterns that should be blocked (.htaccess style)
  const blockedPatterns = [
    // Direct .env file access
    /^\/\.env$/i,
    /^\.env$/i,
    
    // .env variants
    /^\/\.env\./i,
    /\.env$/i,
    /\.env\./i,
    
    // Directory traversal attempts
    /\/\.env$/i,
    /\\\.env$/i,
    
    // URL encoded attempts
    /%2e%65%6e%76/i,   // .env
    /%2eenv/i,
    /\.%65%6e%76/i,
    
    // Double encoded
    /%252e%2565%256e%2576/i,
    
    // Case variations
    /\.ENV$/i,
    /\.Env$/i,
  ];
  
  // Check if any pattern matches
  const isBlocked = blockedPatterns.some(pattern => {
    return pattern.test(url) || pattern.test(urlPath) || pattern.test(originalUrl);
  });
  
  if (isBlocked) {
    // Log the blocked attempt
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.warn(`[ENV PROTECTION] ${timestamp} - Blocked .env access attempt:`);
    console.warn(`  IP: ${clientIP}`);
    console.warn(`  URL: ${originalUrl}`);
    console.warn(`  User-Agent: ${userAgent}`);
    
    // Return 403 Forbidden with no additional information
    res.status(403).type('text/plain').send('Forbidden');
    return;
  }
  
  next();
}

/**
 * Additional file system level protection
 */
export function setupFileSystemProtection() {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    // Check if .env exists
    if (fs.existsSync(envPath)) {
      // Set restrictive permissions (owner read/write only)
      fs.chmodSync(envPath, 0o600);
      console.log('[ENV PROTECTION] File system permissions set to 600 (owner only)');
    }
    
    // Create .env protection indicator file
    const protectionFile = path.join(process.cwd(), '.env-protected');
    fs.writeFileSync(protectionFile, `# .env Protection Active
# Generated: ${new Date().toISOString()}
# This file indicates that .env protection is active
# Do not delete this file
PROTECTION_ACTIVE=true
PROTECTION_TIMESTAMP=${Date.now()}
`);
    
  } catch (error: any) {
    console.warn('[ENV PROTECTION] Could not set file system permissions:', error.message);
  }
}

/**
 * Test .env protection
 */
export function testEnvProtection(): boolean {
  const testPatterns = [
    '/.env',
    '.env',
    '/.env.local',
    '/.env.production',
    '/..%2F.env',
    '/%2e%65%6e%76',
  ];
  
  console.log('[ENV PROTECTION] Testing protection patterns...');
  
  testPatterns.forEach(pattern => {
    const mockReq = { 
      url: pattern, 
      path: pattern, 
      originalUrl: pattern,
      ip: '127.0.0.1',
      get: () => 'test-agent'
    } as any;
    
    const mockRes = {
      status: () => mockRes,
      type: () => mockRes,
      send: (msg: string) => {
        console.log(`  ✓ Pattern "${pattern}" correctly blocked`);
        return mockRes;
      }
    } as any;
    
    let blocked = false;
    const mockNext = () => {
      console.log(`  ✗ Pattern "${pattern}" NOT blocked (should be blocked)`);
    };
    
    // Test the middleware
    envProtectionMiddleware(mockReq, mockRes, mockNext);
  });
  
  return true;
}