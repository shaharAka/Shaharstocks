import disposableDomains from 'disposable-email-domains';

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
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

/**
 * Check if a verification token has expired
 */
export function isTokenExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}
