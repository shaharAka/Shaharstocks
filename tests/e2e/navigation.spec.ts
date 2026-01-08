/**
 * E2E tests for navigation and routing
 */

import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test('should navigate to opportunities page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/opportunities');
    
    // Check that page loaded (adjust based on actual content)
    await expect(authenticatedPage).toHaveURL(/\/opportunities/);
  });

  test('should navigate to portfolio page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portfolio');
    
    // Check that page loaded
    await expect(authenticatedPage).toHaveURL(/\/portfolio/);
  });

  test('should navigate to following page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/following');
    
    // Check that page loaded
    await expect(authenticatedPage).toHaveURL(/\/following/);
  });

  test('should navigate to settings page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    
    // Check that page loaded
    await expect(authenticatedPage).toHaveURL(/\/settings/);
  });

  test('should handle 404 for non-existent routes', async ({ authenticatedPage }) => {
    const response = await authenticatedPage.goto('/non-existent-route');
    
    // Should return 404
    expect(response?.status()).toBe(404);
  });
});

