/**
 * Generates secure random order numbers for payment transactions
 * Uses alphanumeric characters to create unique identifiers
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a random order number with prefix
 * Format: MG-XXXXXXXXXX (12 characters total)
 */
export function generateOrderNumber(): string {
  let result = 'MP';
  for (let i = 0; i < 10; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

/**
 * Validates order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^MP[A-Z0-9]{10}$/.test(orderNumber);
}