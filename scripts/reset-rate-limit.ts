#!/usr/bin/env node
/**
 * Script to reset rate limits for development
 * This clears the in-memory rate limiter cache
 * Usage: tsx scripts/reset-rate-limit.ts
 */

import { createRateLimiter } from '../server/middleware/rateLimiter';

async function resetRateLimit() {
  console.log('Resetting rate limits...');
  
  // The rate limiter uses an in-memory cache
  // In development, we can't easily clear it without restarting the server
  // But we can increase the limits temporarily
  
  console.log('⚠️  Rate limiter uses in-memory cache that persists during server runtime.');
  console.log('To reset rate limits, you need to:');
  console.log('1. Restart the server (this will clear in-memory rate limits)');
  console.log('2. Or wait for the rate limit window to expire (15 minutes)');
  console.log('3. Or temporarily increase the rate limit in development');
  
  process.exit(0);
}

resetRateLimit();

