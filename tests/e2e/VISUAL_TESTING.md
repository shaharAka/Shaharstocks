# Visual Testing Guide - See Tests in Browser

## 🎯 Quick Start - See Tests in Browser

### Option 1: UI Mode (RECOMMENDED - Best Experience)

```bash
npm run test:e2e:ui
```

**What happens:**
1. Playwright UI opens in your browser (usually http://localhost:9323)
2. You see a list of all tests
3. Click "Run all" or click individual tests
4. Browser windows open showing your app
5. Watch tests execute step-by-step in real-time
6. See pass/fail status immediately

**Features:**
- ✅ Interactive - pause, resume, rerun tests
- ✅ Visual - see exactly what's happening
- ✅ Debug - click on any step to see what happened
- ✅ Time travel - go back and see previous steps

### Option 2: Headed Mode (Simple Browser View)

```bash
npm run test:e2e:headed
```

**What happens:**
1. Browser windows open (Chrome, Firefox, Safari)
2. You watch tests execute automatically
3. See each action as it happens
4. Browser closes when done

**Best for:** Quick visual verification

### Option 3: Debug Mode (Step-by-Step)

```bash
npx playwright test --debug
```

**What happens:**
1. Playwright Inspector opens
2. Browser window opens
3. Test pauses at first line
4. Step through line by line
5. Inspect elements, see console logs
6. Control execution manually

**Best for:** Debugging specific issues

### Option 4: Run Specific Test

```bash
# Run just auth tests in headed mode
npx playwright test tests/e2e/auth.spec.ts --headed

# Run specific test by name
npx playwright test -g "should login" --headed

# Run with UI mode
npx playwright test tests/e2e/auth.spec.ts --ui
```

## 📸 Screenshots and Videos

Playwright automatically captures:
- **Screenshots** on test failure (saved to `test-results/`)
- **Videos** on test failure (saved to `test-results/`)
- **Traces** for debugging (saved to `test-results/`)

View them:
```bash
# Open HTML report (includes screenshots/videos)
npm run test:e2e:report

# Or manually
npx playwright show-report
```

## 🎬 What You'll See

When running in **UI mode** (`npm run test:e2e:ui`):

1. **Test List Panel** (left side)
   - All your tests listed
   - Status indicators (pass/fail)
   - Click to run individual tests

2. **Test Details Panel** (right side)
   - Test steps with timestamps
   - Screenshots at each step
   - Network requests
   - Console logs

3. **Browser Window** (opens automatically)
   - Your app running
   - Tests interacting with it
   - See clicks, typing, navigation

4. **Controls**
   - Play/Pause button
   - Step forward/backward
   - Rerun test
   - View trace

## 🔧 Troubleshooting

### Browser doesn't open?

Make sure Playwright browsers are installed:
```bash
npx playwright install
```

### Tests run too fast to see?

Add a pause in your test:
```typescript
test('should do something', async ({ page }) => {
  await page.goto('/login');
  await page.pause(); // Pauses here, opens inspector
  // Continue...
});
```

### Want to see what's on the page?

Run the debug selectors test:
```bash
npx playwright test tests/e2e/debug-selectors.spec.ts --headed
```

This will:
- Show the page in browser
- Print all selectors to console
- Take a screenshot
- Help identify correct selectors

### Server not starting?

The tests automatically start your dev server, but if it fails:
1. Make sure port 5000 is available
2. Check that `npm run dev` works manually
3. Adjust `PLAYWRIGHT_BASE_URL` in `playwright.config.ts`

## 💡 Pro Tips

1. **Use UI mode for development** - Best way to see what's happening
2. **Use headed mode for quick checks** - Faster, less interactive
3. **Use debug mode for troubleshooting** - Step through issues
4. **Check screenshots on failure** - Often shows the problem
5. **View HTML report** - See all test results with media

## 🎥 Example Workflow

```bash
# 1. Start with UI mode to see everything
npm run test:e2e:ui

# 2. If a test fails, check the screenshot
# (automatically saved in test-results/)

# 3. Run the failing test in debug mode
npx playwright test tests/e2e/auth.spec.ts --debug

# 4. Step through to find the issue

# 5. Fix and rerun
npm run test:e2e:ui
```

