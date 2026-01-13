# End-to-End (E2E) Tests

E2E tests test the complete user experience by simulating real user interactions with the application in a real browser environment.

## Setup

### Install Dependencies

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Environment Variables

Create a `.env.test` file or set environment variables:

```env
# Base URL for E2E tests
PLAYWRIGHT_BASE_URL=http://localhost:5000

# Test user credentials (create a dedicated test user)
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=test-password-123

# Optional: Custom start command
PLAYWRIGHT_START_COMMAND=npm run dev
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests and generate HTML report
npx playwright test --reporter=html
```

### View Test Reports

```bash
# Open HTML report
npx playwright show-report
```

## Test Structure

E2E tests:
- Test complete user workflows
- Run in real browsers (Chromium, Firefox, WebKit)
- Test both desktop and mobile viewports
- Include screenshots and videos on failure
- Support parallel execution

## Test Files

- `fixtures.ts` - Custom fixtures (e.g., authenticated page)
- `auth.spec.ts` - Authentication flow tests
- `navigation.spec.ts` - Navigation and routing tests

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    
    // Interact with page
    await page.click('button');
    
    // Assert expected behavior
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Using Authenticated Page Fixture

```typescript
import { test, expect } from './fixtures';

test('should access protected route', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in
  await authenticatedPage.goto('/protected-route');
  
  await expect(authenticatedPage).toHaveURL(/\/protected-route/);
});
```

### Waiting for Elements

```typescript
// Wait for element to be visible
await expect(page.locator('.element')).toBeVisible();

// Wait for text to appear
await expect(page.locator('text=Success')).toBeVisible();

// Wait for navigation
await page.waitForURL((url) => url.pathname.includes('/path'));
```

### Filling Forms

```typescript
await page.fill('input[name="email"]', 'user@example.com');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');
```

### Assertions

```typescript
// Check URL
expect(page.url()).toContain('/path');

// Check element visibility
await expect(page.locator('.element')).toBeVisible();

// Check element text
await expect(page.locator('.element')).toHaveText('Expected Text');

// Check element count
await expect(page.locator('.item')).toHaveCount(5);
```

## Critical User Flows to Test

### ✅ Completed

1. **Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Logout
   - Redirect to login when not authenticated

2. **Navigation**
   - Navigate to main pages
   - Handle 404 errors

### 📋 Next Priority Flows

1. **Stock Management**
   - View stock opportunities
   - Follow/unfollow stocks
   - View stock details

2. **Portfolio Management**
   - View portfolio
   - Add/remove holdings
   - View portfolio performance

3. **Settings**
   - Update user profile
   - Change subscription
   - Update preferences

4. **Search and Filtering**
   - Search stocks
   - Filter opportunities
   - Sort data

## Best Practices

1. **Use Data Attributes**: Add `data-testid` attributes to key elements for reliable selectors
2. **Page Object Model**: Consider creating page objects for complex pages (future enhancement)
3. **Test Isolation**: Each test should be independent
4. **Wait for Elements**: Always wait for elements to be visible/interactive before interacting
5. **Clean Up**: Use fixtures to set up and clean up test data
6. **Use Descriptive Names**: Test names should clearly describe what they test
7. **Test User Flows**: Focus on testing complete user workflows, not implementation details

## Debugging Tests

```bash
# Run in headed mode to see browser
npx playwright test --headed

# Run in debug mode with Playwright Inspector
npx playwright test --debug

# Run specific test with debug mode
npx playwright test auth.spec.ts --debug

# View trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test
  env:
    PLAYWRIGHT_BASE_URL: ${{ secrets.E2E_BASE_URL }}
    E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
    E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
```

## Notes

- E2E tests are slower than unit/integration tests
- Run them separately in CI/CD pipelines
- Use test users/data separate from development
- Consider using test database for E2E tests
- Screenshots and videos are captured on failure for debugging

