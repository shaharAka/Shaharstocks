/**
 * Integration tests for authentication endpoints
 * Tests actual API endpoints with database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from './appFactory';
import { createTestUser, deleteTestUser, cleanupTestUsers } from './helpers';
import type { Express } from 'express';
import type { Server } from 'http';

describe('Integration: Auth Endpoints', () => {
  let app: Express;
  let server: Server;
  let testUser: { id: string; email: string; password: string };

  beforeAll(async () => {
    // Create Express app for testing
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Clean up any existing test users
    await cleanupTestUsers();
    
    // Create a test user for authentication tests
    testUser = await createTestUser({
      email: 'integration-test@example.com',
      emailVerified: true,
    });
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await deleteTestUser(testUser.id);
    }
    
    // Close server
    if (server) {
      await closeTestApp(server);
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require email and password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email })
        .expect(400);

      await request(app)
        .post('/api/auth/login')
        .send({ password: testUser.password })
        .expect(400);
    });
  });

  describe('GET /api/auth/current-user', () => {
    it('should return null when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/current-user')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toBeNull();
    });

    it('should return user when authenticated', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Then check current user
      const response = await agent
        .get('/api/auth/current-user')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toBeNull();
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);

      // Verify logged out
      const response = await agent
        .get('/api/auth/current-user')
        .expect(200);

      expect(response.body.user).toBeNull();
    });
  });
});

