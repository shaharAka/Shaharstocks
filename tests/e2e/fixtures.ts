/**
 * E2E test fixtures and helpers
 * Provides utilities for E2E testing
 */

import { test as base, expect, type Page } from '@playwright/test';

/**
 * Extended test context with custom fixtures
 */
type TestFixtures = {
  authenticatedPage: Page;
};

/**
 * Create authenticated page fixture
 * Automatically logs in before tests
 */
export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for page and form to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="input-email"]', { state: 'visible', timeout: 10000 });

    // Fill in login form using data-testid attributes (more reliable)
    await page.fill('[data-testid="input-email"]', process.env.E2E_TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="input-password"]', process.env.E2E_TEST_USER_PASSWORD || 'test-password');
    
    // Click login button
    await page.click('[data-testid="button-login"]');

    // Wait for navigation to complete (redirect after login)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Use the authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';

