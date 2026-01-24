# Automated Testing with Playwright

This directory contains automated end-to-end tests for the Event Check-in application using [Playwright](https://playwright.dev/).

## Setup

### Install Dependencies

```bash
# Install Playwright and browsers
npm install
npx playwright install
```

### Verify Installation

```bash
npx playwright --version
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:ui
```

This opens the Playwright UI where you can:
- See all tests in a tree view
- Run individual tests
- See live browser updates
- Debug step-by-step

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:headed
```

### Run Specific Test File

```bash
npx playwright test tests/check-in.spec.js
npx playwright test tests/admin-dashboard.spec.js
```

### Debug a Failing Test

```bash
npm run test:debug
```

Or debug a specific test:

```bash
npx playwright test tests/check-in.spec.js --debug
```

### View Test Report

After running tests:

```bash
npm run test:report
```

## Test Files

### `check-in.spec.js`

Tests for the main check-in interface:
- ✅ Attendee list display
- ✅ Check-in/undo functionality
- ✅ Statistics updates
- ✅ Search and filtering
- ✅ Tab switching
- ✅ Database persistence
- ✅ Performance (load time)

### `admin-dashboard.spec.js`

Tests for the admin dashboard:
- ✅ System Status display
- ✅ Attendee statistics
- ✅ Reset check-ins functionality
- ✅ Data source configuration display
- ✅ Error handling
- ✅ Performance (load time)

## Test Configuration

Tests are configured in `playwright.config.js`:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: http://localhost:8000
- **Timeout**: 30 seconds per test
- **Retries**: 0 locally, 2 in CI
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Trace**: On first retry

## Writing New Tests

Create a new file in the `tests/` directory:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('My Feature', () => {
    test('should do something', async ({ page }) => {
        await page.goto('http://localhost:8000/index.html');

        const element = page.locator('#myElement');
        await expect(element).toBeVisible();
    });
});
```

## Common Selectors

```javascript
// By ID
page.locator('#attendeeList')

// By class
page.locator('.attendee-item')

// By text
page.locator('button:has-text("Check In")')

// By role
page.getByRole('button', { name: 'Check In' })

// Chained
page.locator('.attendee-item').first()
page.locator('.attendee-item').filter({ hasText: 'John' })
```

## Best Practices

1. **Wait for elements properly**
   ```javascript
   await page.waitForSelector('#element');
   await expect(element).toBeVisible();
   ```

2. **Use meaningful test names**
   ```javascript
   test('should check in attendee and update statistics', async ({ page }) => {
   ```

3. **Test user flows, not implementation**
   - Focus on what users do, not internal state

4. **Keep tests independent**
   - Each test should work on its own
   - Use `beforeEach` for common setup

5. **Use appropriate assertions**
   ```javascript
   await expect(element).toBeVisible();
   await expect(element).toHaveText('Expected');
   expect(count).toBeGreaterThan(0);
   ```

## CI/CD Integration

Tests can be integrated into GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/
```

## Debugging Tips

### Use Playwright Inspector

```bash
npx playwright test --debug
```

### Add console logs

```javascript
test('my test', async ({ page }) => {
    page.on('console', msg => console.log(msg.text()));
    await page.goto('http://localhost:8000');
});
```

### Take screenshots

```javascript
await page.screenshot({ path: 'screenshot.png' });
```

### Pause execution

```javascript
await page.pause();
```

## Troubleshooting

### Server not starting

Make sure Python is installed and port 8000 is available:

```bash
python3 -m http.server 8000
```

### Browser not installed

```bash
npx playwright install chromium
```

### Tests timing out

Increase timeout in test or config:

```javascript
test.setTimeout(60000); // 60 seconds
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
