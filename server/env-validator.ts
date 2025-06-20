import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Environment validation and security system
 * Validates required environment variables and protects sensitive data
 */

interface RequiredEnvVars {
  DATABASE_URL?: string;
  SESSION_SECRET: string;
  NODE_ENV: string;
  PORT: string;
  PRIMEPAG_CLIENT_ID?: string;
  PRIMEPAG_CLIENT_SECRET?: string;
  PLISIO_SECRET_KEY?: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
}

export class EnvValidator {
  private static instance: EnvValidator;
  private validatedVars: RequiredEnvVars = {} as RequiredEnvVars;
  private isValidated = false;

  private constructor() {}

  static getInstance(): EnvValidator {
    if (!EnvValidator.instance) {
      EnvValidator.instance = new EnvValidator();
    }
    return EnvValidator.instance;
  }

  /**
   * Validates and secures environment variables
   */
  validateEnvironment(): boolean {
    if (this.isValidated) {
      return true;
    }

    try {
      // Check if .env file exists and is readable
      this.checkEnvFilePermissions();

      // Validate critical environment variables
      this.validateCriticalVars();

      // Generate secure SESSION_SECRET if not provided
      this.ensureSecureSessionSecret();

      // Validate payment API configurations
      this.validatePaymentConfigs();

      // Validate admin credentials
      this.validateAdminCredentials();

      this.isValidated = true;
      console.log('[ENV] Environment validation completed successfully');
      return true;

    } catch (error) {
      console.error('[ENV] Environment validation failed:', error.message);
      return false;
    }
  }

  private checkEnvFilePermissions(): void {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found. Copy .env.example to .env and configure it.');
    }

    try {
      const stats = fs.statSync(envPath);
      
      // Check file permissions (should not be world-readable)
      const mode = stats.mode & parseInt('777', 8);
      if (mode & parseInt('044', 8)) {
        console.warn('[ENV] WARNING: .env file is readable by group/others. Consider restricting permissions.');
      }
    } catch (error) {
      console.warn('[ENV] Could not check .env file permissions:', error.message);
    }
  }

  private validateCriticalVars(): void {
    const required = ['NODE_ENV', 'PORT', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];
    
    for (const varName of required) {
      if (!process.env[varName]) {
        throw new Error(`Required environment variable ${varName} is missing`);
      }
      this.validatedVars[varName as keyof RequiredEnvVars] = process.env[varName] as any;
    }

    // Validate NODE_ENV values
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV!)) {
      throw new Error('NODE_ENV must be one of: development, production, test');
    }

    // Validate PORT
    const port = parseInt(process.env.PORT!);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be a valid number between 1-65535');
    }
  }

  private ensureSecureSessionSecret(): void {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be at least 32 characters in production');
      }
      
      // Generate secure random secret for development
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
      console.log('[ENV] Generated secure SESSION_SECRET for development');
    }
    
    this.validatedVars.SESSION_SECRET = process.env.SESSION_SECRET;
  }

  private validatePaymentConfigs(): void {
    // Validate Primepag configuration
    if (process.env.PRIMEPAG_CLIENT_ID || process.env.PRIMEPAG_CLIENT_SECRET) {
      if (!process.env.PRIMEPAG_CLIENT_ID || !process.env.PRIMEPAG_CLIENT_SECRET) {
        throw new Error('Both PRIMEPAG_CLIENT_ID and PRIMEPAG_CLIENT_SECRET must be provided');
      }
      
      this.validatedVars.PRIMEPAG_CLIENT_ID = process.env.PRIMEPAG_CLIENT_ID;
      this.validatedVars.PRIMEPAG_CLIENT_SECRET = process.env.PRIMEPAG_CLIENT_SECRET;
    }

    // Validate Plisio configuration
    if (process.env.PLISIO_SECRET_KEY) {
      if (process.env.PLISIO_SECRET_KEY.length < 32) {
        throw new Error('PLISIO_SECRET_KEY must be at least 32 characters');
      }
      this.validatedVars.PLISIO_SECRET_KEY = process.env.PLISIO_SECRET_KEY;
    }
  }

  private validateAdminCredentials(): void {
    const username = process.env.ADMIN_USERNAME!;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH!;

    // Validate username format
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('ADMIN_USERNAME must be at least 3 characters and contain only alphanumeric characters and underscores');
    }

    // Validate bcrypt hash format
    if (!passwordHash.startsWith('$2b$') || passwordHash.length < 60) {
      throw new Error('ADMIN_PASSWORD_HASH must be a valid bcrypt hash');
    }

    this.validatedVars.ADMIN_USERNAME = username;
    this.validatedVars.ADMIN_PASSWORD_HASH = passwordHash;
  }

  /**
   * Gets validated environment variable safely
   */
  getVar(name: keyof RequiredEnvVars): string | undefined {
    if (!this.isValidated) {
      throw new Error('Environment not validated. Call validateEnvironment() first.');
    }
    return this.validatedVars[name];
  }

  /**
   * Checks if environment is production
   */
  isProduction(): boolean {
    return this.getVar('NODE_ENV') === 'production';
  }

  /**
   * Checks if environment is development
   */
  isDevelopment(): boolean {
    return this.getVar('NODE_ENV') === 'development';
  }

  /**
   * Gets secure session secret
   */
  getSessionSecret(): string {
    const secret = this.getVar('SESSION_SECRET');
    if (!secret) {
      throw new Error('SESSION_SECRET not available');
    }
    return secret;
  }
}

// Export singleton instance
export const envValidator = EnvValidator.getInstance();