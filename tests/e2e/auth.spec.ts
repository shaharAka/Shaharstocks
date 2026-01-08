/**
 * E2E tests for authentication flows
 */

import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for the login form to be visible (with longer timeout)
    await page.waitForSelector('[data-testid="input-email"]', { state: 'visible', timeout: 10000 });
    
    // Check that login form elements are visible (using data-testid for reliability)
    await expect(page.locator('[data-testid="input-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-login"]')).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/opportunities');
    
    // Should redirect to login
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should login with valid credentials', async ({ page, baseURL }) => {
    const testEmail = process.env.E2E_TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_USER_PASSWORD || 'test-password';

    await page.goto(`${baseURL}/login`);
    
    // Wait for page and form to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="input-email"]', { state: 'visible', timeout: 10000 });
    
    // Fill in login form using data-testid attributes
    await page.fill('[data-testid="input-email"]', testEmail);
    await page.fill('[data-testid="input-password"]', testPassword);
    
    // Submit form
    await page.click('[data-testid="button-login"]');
    
    // Should redirect to main app (not login page)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for page and form to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="input-email"]', { state: 'visible', timeout: 10000 });
    
    // Fill in invalid credentials
    await page.fill('[data-testid="input-email"]', 'invalid@example.com');
    await page.fill('[data-testid="input-password"]', 'wrong-password');
    
    // Submit form
    await page.click('[data-testid="button-login"]');
    
    // Should show error message (toast notification or form error)
    // Check for common error indicators
    await expect(
      page.locator('text=/error|invalid|incorrect|authentication failed|wrong credentials/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ authenticatedPage }) => {
    // Assuming there's a logout button/menu
    // Adjust selectors based on actual implementation
    const logoutButton = authenticatedPage.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to login page
      await authenticatedPage.waitForURL((url) => url.pathname.includes('/login'), { timeout: 5000 });
      expect(authenticatedPage.url()).toContain('/login');
    }
  });
});

