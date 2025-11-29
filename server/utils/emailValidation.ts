import { createRequire } from 'module';
import { randomBytes } from 'crypto';

const require = createRequire(import.meta.url);
const disposableDomains: string[] = require('disposable-email-domains');

/**
 * Check if an email uses a disposable/temporary email domain
 * Returns true if the email is from a known disposable provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  
  return disposableDomains.includes(domain);
}

/**
 * Generate a cryptographically secure random verification token
 * Uses crypto.randomBytes for security instead of Math.random
 */
export function generateVerificationToken(): string {
  // Generate 32 bytes of random data = 64 hex characters
  return randomBytes(32).toString('hex');
}

/**
 * Check if a verification token has expired
 */
export function isTokenExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}
