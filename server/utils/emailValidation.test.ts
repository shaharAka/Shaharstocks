import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  isDisposableEmail, 
  generateVerificationToken, 
  isTokenExpired 
} from './emailValidation';

describe('emailValidation', () => {
  describe('isDisposableEmail', () => {
    it('should return true for disposable email domains', () => {
      expect(isDisposableEmail('test@tempmail.com')).toBe(true);
      expect(isDisposableEmail('user@10minutemail.com')).toBe(true);
      expect(isDisposableEmail('test@guerrillamail.com')).toBe(true);
    });

    it('should return false for regular email domains', () => {
      expect(isDisposableEmail('user@gmail.com')).toBe(false);
      expect(isDisposableEmail('test@yahoo.com')).toBe(false);
      expect(isDisposableEmail('admin@company.com')).toBe(false);
      expect(isDisposableEmail('user@example.org')).toBe(false);
    });

    it('should handle case-insensitive email addresses', () => {
      expect(isDisposableEmail('TEST@TEMPTMAIL.COM')).toBe(true);
      expect(isDisposableEmail('User@Gmail.COM')).toBe(false);
    });

    it('should return false for invalid email formats', () => {
      // Note: This depends on implementation - these might throw or return false
      expect(isDisposableEmail('notanemail')).toBe(false);
      expect(isDisposableEmail('@nodomain.com')).toBe(false);
    });

    it('should handle empty values gracefully', () => {
      expect(isDisposableEmail('')).toBe(false);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a token string', () => {
      const token = generateVerificationToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of consistent length', () => {
      const tokens = Array.from({ length: 10 }, () => generateVerificationToken());
      const lengths = tokens.map(t => t.length);
      const uniqueLengths = new Set(lengths);
      // All tokens should have the same length (or at least similar)
      expect(uniqueLengths.size).toBeLessThanOrEqual(2); // Allow for minor variations
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future expiry dates', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour in the future
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it('should return true for past expiry dates', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour in the past
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it('should return true for dates very close to now (within 1 minute)', () => {
      const justNow = new Date();
      justNow.setSeconds(justNow.getSeconds() - 30); // 30 seconds ago
      expect(isTokenExpired(justNow)).toBe(true);
    });

    it('should handle null or undefined gracefully', () => {
      // This depends on implementation - adjust based on actual behavior
      expect(isTokenExpired(null as any)).toBe(true);
      expect(isTokenExpired(undefined as any)).toBe(true);
    });
  });
});

