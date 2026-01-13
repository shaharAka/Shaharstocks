/**
 * Debug test to help identify selectors and page structure
 * Run this to see what's actually on the page
 */

import { test, expect } from './fixtures';

test.describe('Debug: Page Structure', () => {
  test('should inspect login page structure', async ({ page }) => {
    await page.goto('/login');
    
    // Wait a bit for page to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/e2e/debug-login-page.png', fullPage: true });
    
    // Check if email input exists with different selectors
    const selectors = [
      '[data-testid="input-email"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[data-testid="input-email"]',
      'input[placeholder*="email" i]',
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`Selector "${selector}": ${count} element(s) found`);
      
      if (count > 0) {
        const isVisible = await page.locator(selector).first().isVisible();
        console.log(`  - Visible: ${isVisible}`);
      }
    }
    
    // Get all inputs on the page
    const allInputs = await page.locator('input').all();
    console.log(`Total inputs found: ${allInputs.length}`);
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const testId = await input.getAttribute('data-testid');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      
      console.log(`Input ${i}: type="${type}", name="${name}", data-testid="${testId}", id="${id}", placeholder="${placeholder}"`);
    }
    
    // Check page title and URL
    console.log(`Page URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    
    // Check for any error messages
    const bodyText = await page.textContent('body');
    console.log(`Body text length: ${bodyText?.length || 0} characters`);
    
    // This test will always pass - it's just for debugging
    expect(true).toBe(true);
  });
});

