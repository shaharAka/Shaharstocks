/**
 * Integration test setup
 * Configures test database and environment for integration tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

// Test database configuration
// Use a separate test database URL or add /test suffix
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for integration tests');
}

/**
 * Setup before all integration tests
 */
beforeAll(async () => {
  // Verify database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log('[Integration Tests] Database connection verified');
  } catch (error) {
    console.error('[Integration Tests] Failed to connect to test database:', error);
    throw error;
  }
});

/**
 * Cleanup after all integration tests
 */
afterAll(async () => {
  // Close database connections if needed
  // Note: Drizzle handles connection pooling automatically
});

/**
 * Cleanup before each test (optional)
 * Use this to clean test data between tests if needed
 */
beforeEach(async () => {
  // Optionally clean up test data here
  // Example: await cleanupTestData();
});

/**
 * Cleanup after each test (optional)
 */
afterEach(async () => {
  // Optionally clean up test data here
});

