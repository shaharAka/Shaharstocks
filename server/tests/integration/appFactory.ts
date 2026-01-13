/**
 * Factory for creating Express app for integration tests
 * Sets up app with same middleware as production, but test-friendly configuration
 */

import express, { type Express } from 'express';
import { registerRoutes } from '../../routes';
import type { Server } from 'http';

/**
 * Create Express app configured for integration testing
 * Includes all middleware but with test-friendly settings
 */
export async function createTestApp(): Promise<{ app: Express; server: Server }> {
  const app = express();

  // Basic middleware (same as production)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register all routes
  const server = await registerRoutes(app);

  return { app, server };
}

/**
 * Close test app and server
 */
export async function closeTestApp(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

