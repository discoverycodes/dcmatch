// Sistema de sanitização de logs para prevenir exposição de dados sensíveis
export class LogSanitizer {
  private static sensitiveFields = [
    'password', 'token', 'secret', 'key', 'hash', 'auth',
    'balance', 'amount', 'earning', 'withdrawal', 'deposit',
    'email', 'cpf', 'phone', 'pix_key', 'wallet_address',
    'session', 'cookie', 'authorization'
  ];

  // Sanitizar dados antes de fazer log
  static sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data);
    }
    
    return data;
  }

  private static sanitizeString(str: string): string {
    // Mascarar números que podem ser valores monetários
    str = str.replace(/\d+\.\d{2}/g, '***.**');
    str = str.replace(/R\$\s*\d+/g, 'R$ ***');
    
    // Mascarar emails
    str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
    
    // Mascarar CPFs
    str = str.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***.***.**-**');
    str = str.replace(/\d{11}/g, '***********');
    
    // Mascarar chaves PIX (emails, telefones, CPFs)
    str = str.replace(/pix[_-]?key['":]?\s*['"'][^'"]+['"']/gi, 'pix_key: "***"');
    
    // Mascarar endereços de carteira
    str = str.replace(/[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g, '***WALLET***');
    
    return str;
  }

  private static sanitizeObject(obj: any): any {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      // Se a chave contém campo sensível, mascarar valor
      if (this.sensitiveFields.some(field => keyLower.includes(field))) {
        if (typeof value === 'string') {
          sanitized[key] = this.maskValue(value);
        } else if (typeof value === 'number') {
          sanitized[key] = '***';
        } else {
          sanitized[key] = '***';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private static maskValue(value: string): string {
    if (value.length <= 4) return '***';
    
    // Mostrar apenas os primeiros e últimos caracteres
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.max(3, value.length - 4));
    
    return start + middle + end;
  }

  // Log seguro para informações financeiras
  static logFinancial(operation: string, userId: number, amount?: number): void {
    console.log(`[FINANCIAL] ${operation} - User: ${userId} - Amount: ${amount ? '***.**' : 'N/A'}`);
  }

  // Log seguro para autenticação
  static logAuth(operation: string, identifier: string): void {
    const maskedId = identifier.length > 4 
      ? identifier.substring(0, 2) + '***' + identifier.substring(identifier.length - 2)
      : '***';
    console.log(`[AUTH] ${operation} - User: ${maskedId}`);
  }

  // Log seguro para pagamentos
  static logPayment(operation: string, method: string, userId: number): void {
    console.log(`[PAYMENT] ${operation} - Method: ${method} - User: ${userId}`);
  }

  // Log seguro para erros sem dados sensíveis
  static logError(operation: string, error: Error): void {
    console.error(`[ERROR] ${operation} - Type: ${error.name} - Safe message: Operation failed`);
  }
}

// Função helper para logs seguros
export function safeLog(level: 'info' | 'error' | 'warn', message: string, data?: any): void {
  const sanitizedData = data ? LogSanitizer.sanitize(data) : '';
  const sanitizedMessage = LogSanitizer.sanitize(message);
  
  switch (level) {
    case 'info':
      console.log(`[SAFE] ${sanitizedMessage}`, sanitizedData);
      break;
    case 'error':
      console.error(`[SAFE ERROR] ${sanitizedMessage}`, sanitizedData);
      break;
    case 'warn':
      console.warn(`[SAFE WARN] ${sanitizedMessage}`, sanitizedData);
      break;
  }
}
// Production-ready sanitized logging wrapper
export function productionSafeLog(level: string, operation: string, data?: any) {
  // Only log operation type and user ID in production
  const sanitizedData = data?.userId ? { userId: data.userId } : {};
  console.log(`[${level.toUpperCase()}] ${operation}`, sanitizedData);
}

export function productionSafeError(operation: string, error: Error) {
  // Only log operation and error type, never sensitive details
  console.error(`[ERROR] ${operation} - ${error.name}`);
}
