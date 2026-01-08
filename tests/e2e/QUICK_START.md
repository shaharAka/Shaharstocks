# Quick Start: Run E2E Tests in Browser

## 🚀 Quick Setup

```bash
# 1. Install Playwright
npm install --save-dev @playwright/test

# 2. Install browser binaries
npx playwright install

# 3. Set up test user credentials (optional - uses defaults if not set)
# Create a .env file or export:
export E2E_TEST_USER_EMAIL=your-test-user@example.com
export E2E_TEST_USER_PASSWORD=your-test-password
```

## 🎯 Run Tests in Browser

### Option 1: UI Mode (RECOMMENDED - Interactive & Visual)

This is the **best way** to test in the browser during development:

```bash
npm run test:e2e:ui
```

**What you'll see:**
- Interactive test runner UI
- Tests running in real browser windows
- Step-by-step execution
- Ability to pause, debug, and inspect
- Time travel debugging

### Option 2: Headed Mode (See Browser Window)

Run tests with visible browser:

```bash
npm run test:e2e:headed
```

**What you'll see:**
- Browser windows opening
- Tests executing step-by-step
- You can watch what's happening

### Option 3: Normal Mode (Headless - Fast)

Run tests without visible browser (faster, for CI):

```bash
npm run test:e2e
```

## 📊 View Test Results

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

This opens a detailed HTML report with:
- Test results and status
- Screenshots on failure
- Videos on failure
- Trace files for debugging

## 🔧 Debugging Tests

### Run with Inspector

```bash
npx playwright test --debug
```

This opens Playwright Inspector where you can:
- Step through tests line by line
- Inspect elements
- See console logs
- Time travel through actions

### Run Specific Test

```bash
# Run only auth tests
npx playwright test tests/e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should login with valid credentials"

# Run with UI mode
npx playwright test tests/e2e/auth.spec.ts --ui
```

### Pause Execution

Add `await page.pause()` in your test to pause execution:

```typescript
test('should do something', async ({ page }) => {
  await page.goto('/login');
  await page.pause(); // Execution pauses here, opens inspector
  // Continue with test...
});
```

## 🎨 What to Expect

When you run `npm run test:e2e:ui`, you'll see:

1. **Playwright UI** opens in your browser (usually http://localhost:9323)
2. **Test list** showing all your E2E tests
3. **Click "Run all"** or click individual tests
4. **Browser windows** open showing the app
5. **Watch tests execute** step by step
6. **See results** with pass/fail status

## 📝 Update Selectors

If tests fail due to selector issues, you may need to update selectors in:
- `tests/e2e/fixtures.ts` - For login form selectors
- `tests/e2e/auth.spec.ts` - For authentication tests

Common selector patterns:
```typescript
// By input type
await page.fill('input[type="email"]', 'email@example.com');

// By name attribute
await page.fill('input[name="email"]', 'email@example.com');

// By data-testid (best practice - add these to your components)
await page.fill('[data-testid="email-input"]', 'email@example.com');

// By label text
await page.fill('label:has-text("Email") input', 'email@example.com');
```

## 🔍 Troubleshooting

### Tests fail to find elements?

1. Check if your dev server is running: `npm run dev`
2. Update selectors to match your actual HTML structure
3. Add `data-testid` attributes to key elements for reliable selectors
4. Use Playwright Inspector (`--debug`) to inspect the page

### Dev server not starting?

The tests automatically start the dev server, but if it fails:
1. Make sure port 5000 is available
2. Check that `npm run dev` works manually
3. Adjust `PLAYWRIGHT_BASE_URL` in playwright.config.ts if needed

### Need to update test user?

Update environment variables:
```bash
export E2E_TEST_USER_EMAIL=test@example.com
export E2E_TEST_USER_PASSWORD=test-password-123
```

Or create a `.env.test` file (Playwright will read it automatically if configured).

