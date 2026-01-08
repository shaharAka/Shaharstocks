import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/tests/',
        '**/test-utils/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'server/routes/**', // Routes are integration tested
        'server/index.ts', // Entry point
        'server/vite.ts', // Vite-specific
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    testTimeout: 10000,
    // Setup files
    setupFiles: ['./server/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
