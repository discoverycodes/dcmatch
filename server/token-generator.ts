import crypto from 'crypto';

/**
 * Gera um token único de 10 caracteres alfanuméricos
 * Usa caracteres seguros: A-Z, a-z, 0-9 (excluindo caracteres ambíguos)
 */
export function generateUserToken(): string {
  // Caracteres seguros (sem 0, O, l, I para evitar confusão)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let token = '';
  
  for (let i = 0; i < 10; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  
  return token;
}

/**
 * Gera um token único garantindo que não existe no banco
 */
export async function generateUniqueUserToken(checkFunction: (token: string) => Promise<boolean>): Promise<string> {
  let token: string;
  let attempts = 0;
  const maxAttempts = 100; // Limite de segurança
  
  do {
    token = generateUserToken();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique user token after maximum attempts');
    }
  } while (await checkFunction(token));
  
  return token;
}

/**
 * Valida se um token tem o formato correto
 */
export function isValidUserToken(token: string): boolean {
  return /^[A-Za-z0-9]{10}$/.test(token);
}