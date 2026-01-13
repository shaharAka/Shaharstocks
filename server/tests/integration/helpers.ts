/**
 * Integration test helpers
 * Provides utilities for integration testing with database
 */

import type { Express } from 'express';
import request, { type SuperAgentTest } from 'supertest';
import { db } from '../../db';
import { users } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  subscriptionStatus: string;
}> = {}): Promise<{
  id: string;
  email: string;
  password: string; // Returns plain password for testing
}> {
  const testId = overrides.id || `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const testEmail = overrides.email || `test-${testId}@example.com`;
  const testPassword = 'test-password-123';
  const passwordHash = overrides.passwordHash || await bcrypt.hash(testPassword, 10);

  await db.insert(users).values({
    id: testId,
    email: testEmail,
    name: overrides.name || 'Test User',
    passwordHash,
    emailVerified: overrides.emailVerified ?? true,
    subscriptionStatus: overrides.subscriptionStatus || 'trial',
    avatarColor: '#3b82f6',
  });

  return {
    id: testId,
    email: testEmail,
    password: testPassword,
  };
}

/**
 * Delete a test user from the database
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Create an authenticated session for testing
 */
export async function createAuthenticatedSession(
  app: Express,
  email: string,
  password: string
): Promise<request.SuperTest<request.Test>> {
  // Login to create session
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  
  return agent;
}

/**
 * Clean up all test users (users with test- prefix in email)
 */
export async function cleanupTestUsers(): Promise<void> {
  await db.execute(sql`DELETE FROM users WHERE email LIKE 'test-%@%'`);
}

/**
 * Execute SQL directly (useful for setup/teardown)
 */
export async function executeSql(query: string): Promise<void> {
  await db.execute(sql.raw(query));
}

