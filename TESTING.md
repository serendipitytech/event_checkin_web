# Testing Strategy - Event Check-in System

**Version:** 1.0.0
**Last Updated:** 2026-01-23
**Testing Framework:** Playwright (via Claude Code MCP)

---

## 📋 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Test Types](#test-types)
4. [Playwright MCP Integration](#playwright-mcp-integration)
5. [Test Scenarios](#test-scenarios)
6. [Running Tests](#running-tests)
7. [CI/CD Integration](#cicd-integration)

---

## 🎯 Testing Philosophy

### Core Principles

1. **Test-Driven Development (TDD)**
   - Write tests before implementation
   - Red → Green → Refactor cycle
   - High test coverage (target: 80%+)

2. **Testing Trophy**
   ```
           Integration Tests (60%)
          /                  \
         /                    \
   Unit Tests (20%)      E2E Tests (20%)
   ```

3. **Security-First**
   - Every security feature has dedicated tests
   - XSS and SQL injection prevention validated
   - Input validation thoroughly tested

4. **Real-World Scenarios**
   - Test with production-like data
   - Multi-device scenarios
   - Network failure handling

---

## 🏗️ Test Pyramid

### Level 1: Unit Tests (20%)
**Location:** Browser-based test runner (`test-runner.html`)

**Coverage:**
- Email validation logic
- Data transformation functions
- Utility functions
- Business logic

**Example:** `email-validation.test.js` (26 tests)

### Level 2: Integration Tests (60%)
**Tool:** Playwright MCP via Claude Code

**Coverage:**
- Component interactions
- Data source integrations
- Database operations
- Real-time sync
- Authentication flows

### Level 3: End-to-End Tests (20%)
**Tool:** Playwright MCP via Claude Code

**Coverage:**
- Complete user workflows
- Multi-device scenarios
- Production-like environments
- Critical paths

---

## 🧪 Test Types

### 1. Unit Tests
**Framework:** Custom browser-based runner
**File Pattern:** `*.test.js`

```javascript
// Example: email-validation.test.js
describe('EmailValidator', () => {
    test('should validate correct email format', () => {
        expect(EmailValidator.isValid('user@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
        expect(EmailValidator.isValid('invalid')).toBe(false);
    });

    test('should prevent XSS attacks', () => {
        const result = EmailValidator.validate('<script>alert("xss")</script>@test.com');
        expect(result.valid).toBe(false);
    });
});
```

**Running Unit Tests:**
1. Open `test-runner.html` in browser
2. Tests auto-run on page load
3. View results in UI
4. Check console for detailed output

### 2. Integration Tests
**Framework:** Playwright MCP

```javascript
// Example: Check-in flow integration test
describe('Check-in Flow', () => {
    test('should check in attendee and update statistics', async () => {
        await page.goto('http://localhost:8000');

        // Initial state
        const initialPending = await page.textContent('#pendingCount');

        // Check in first attendee
        await page.click('[data-id="1"] .btn-check-in');

        // Wait for update
        await page.waitForTimeout(500);

        // Verify status changed
        const status = await page.getAttribute('[data-id="1"]', 'class');
        expect(status).toContain('checked-in');

        // Verify statistics updated
        const newPending = await page.textContent('#pendingCount');
        expect(parseInt(newPending)).toBe(parseInt(initialPending) - 1);
    });
});
```

### 3. End-to-End Tests
**Framework:** Playwright MCP
**Focus:** Complete user journeys

```javascript
// Example: Complete event check-in workflow
describe('Complete Check-in Workflow', () => {
    test('organizer creates event and checks in attendees', async () => {
        // 1. Login as organizer
        await page.goto('http://localhost:8000/admin.html');
        await page.fill('#email', 'admin@test.com');
        await page.fill('#password', 'test123');
        await page.click('button[type="submit"]');

        // 2. Create new event
        await page.click('button:has-text("Create Event")');
        await page.fill('#eventName', 'Test Event 2026');
        await page.fill('#eventDate', '2026-03-15');
        await page.click('button:has-text("Save")');

        // 3. Import attendees
        const csvContent = `Table,Group,Name,Ticket,Email
1,VIP,John Doe,Premium,john@test.com
2,General,Jane Smith,Standard,jane@test.com`;

        await page.setInputFiles('#csvUpload', {
            name: 'attendees.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });

        // 4. Navigate to check-in view
        await page.goto('http://localhost:8000');

        // 5. Check in attendee
        await page.fill('#searchInput', 'John');
        await page.click('.attendee-card:has-text("John") .btn-check-in');

        // 6. Verify check-in
        expect(await page.locator('.attendee-card:has-text("John")')).toHaveClass(/checked-in/);
    });
});
```

### 4. Security Tests
**Focus:** Vulnerability prevention

```javascript
describe('Security Tests', () => {
    test('should prevent XSS in attendee names', async () => {
        const xssPayload = '<script>alert("XSS")</script>';

        await page.goto('http://localhost:8000');
        await addAttendee(xssPayload, 'test@example.com');

        // Should be escaped in HTML
        const content = await page.content();
        expect(content).not.toContain('<script>alert("XSS")</script>');
        expect(content).toContain('&lt;script&gt;');
    });

    test('should prevent SQL injection in email field', async () => {
        const sqlPayload = "'; DROP TABLE attendees; --";

        await page.goto('http://localhost:8000');

        const result = await addAttendee('Test User', sqlPayload);

        expect(result.error).toContain('Invalid email');
        // Verify table still exists
        const attendees = await page.locator('.attendee-card');
        expect(await attendees.count()).toBeGreaterThan(0);
    });

    test('should require authentication for admin actions', async () => {
        // Try to access admin without login
        await page.goto('http://localhost:8000/admin.html');

        // Should redirect to login
        expect(page.url()).toContain('login');

        // Try API call without auth
        const response = await page.evaluate(async () => {
            return fetch('/api/events', {
                method: 'POST',
                body: JSON.stringify({ name: 'Hack Event' })
            });
        });

        expect(response.status).toBe(401);
    });
});
```

### 5. Performance Tests
**Focus:** Load time, responsiveness

```javascript
describe('Performance Tests', () => {
    test('should load 500 attendees in < 3 seconds', async () => {
        await page.goto('http://localhost:8000');

        // Generate 500 attendees
        await loadTestData(500);

        const startTime = Date.now();
        await page.reload();
        await page.waitForSelector('.attendee-card');
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid check-ins without lag', async () => {
        await page.goto('http://localhost:8000');

        // Check in 10 attendees rapidly
        for (let i = 1; i <= 10; i++) {
            const startTime = Date.now();
            await page.click(`[data-id="${i}"] .btn-check-in`);
            await page.waitForSelector(`[data-id="${i}"].checked-in`);
            const responseTime = Date.now() - startTime;

            expect(responseTime).toBeLessThan(500);
        }
    });
});
```

---

## 🤖 Playwright MCP Integration

### Setup via Claude Code

Playwright MCP is available directly in Claude Code. No installation needed!

### Available MCP Tools

```javascript
// Browser navigation
mcp__MCP_DOCKER__browser_navigate({ url: 'http://localhost:8000' })

// Click elements
mcp__MCP_DOCKER__browser_click({ element: 'Check In button', ref: 'button.btn-check-in' })

// Fill forms
mcp__MCP_DOCKER__browser_fill_form({ fields: [
    { name: 'email', type: 'textbox', ref: '#email', value: 'test@example.com' }
]})

// Take screenshots
mcp__MCP_DOCKER__browser_take_screenshot({ filename: 'check-in-screen.png' })

// Access snapshot (accessibility tree)
mcp__MCP_DOCKER__browser_snapshot()

// Run custom Playwright code
mcp__MCP_DOCKER__browser_run_code({ code: `
    await page.click('.btn-check-in');
    await page.waitForSelector('.checked-in');
    return await page.textContent('.check-in-time');
`})
```

### Writing Tests with MCP

**Step 1: Request Test via Claude Code**
```
Test the check-in flow using Playwright MCP:
1. Navigate to localhost:8000
2. Search for "John Doe"
3. Click check-in button
4. Verify status changes to checked-in
5. Take screenshot of result
```

**Step 2: Claude Executes via MCP**
Claude will use the Playwright MCP tools to:
- Navigate to the page
- Interact with elements
- Verify expectations
- Capture results

**Step 3: Review Results**
Screenshots and test results appear in Claude's response.

### Example Test Session with Claude Code

```
User: "Test the email validation on the add attendee form"

Claude: I'll test the email validation using Playwright MCP.

[Uses browser_navigate]
[Uses browser_fill_form with invalid email]
[Uses browser_click on submit]
[Uses browser_snapshot to check for error message]
[Takes screenshot of validation error]

Result: ✅ Email validation working correctly
- Invalid email shows error: "Invalid email format"
- Form does not submit
- Error message visible in UI
Screenshot: validation-error.png
```

---

## 📝 Test Scenarios

### Critical Path Tests (P0)

#### 1. Check-in Happy Path
**Scenario:** Volunteer checks in attendee successfully

```
Given: An event with attendees loaded
When: I search for "John Doe"
And: I click "Check In"
Then: Status changes to "checked-in"
And: Timestamp appears
And: Statistics update
And: Toast notification shows success
```

**Playwright Test:**
```javascript
test('check-in happy path', async () => {
    await page.goto('http://localhost:8000');
    await page.fill('#searchInput', 'John Doe');
    await page.click('.attendee-card:has-text("John Doe") .btn-check-in');

    await expect(page.locator('.attendee-card:has-text("John Doe")')).toHaveClass(/checked-in/);
    await expect(page.locator('.check-in-time')).toBeVisible();
    await expect(page.locator('#checkedInCount')).toHaveText(/1/);
});
```

#### 2. Multi-Device Sync
**Scenario:** Check-in on one device appears on another

```
Given: Two devices open on same event
When: Device A checks in attendee
Then: Device B shows updated status within 2 seconds
```

**Playwright Test:**
```javascript
test('multi-device sync', async () => {
    const device1 = await browser.newPage();
    const device2 = await browser.newPage();

    await device1.goto('http://localhost:8000');
    await device2.goto('http://localhost:8000');

    // Check in on device 1
    await device1.click('[data-id="1"] .btn-check-in');

    // Wait for sync
    await device2.waitForTimeout(2000);

    // Verify on device 2
    const status = await device2.getAttribute('[data-id="1"]', 'class');
    expect(status).toContain('checked-in');
});
```

#### 3. Undo Check-in
**Scenario:** Volunteer accidentally checks in wrong person

```
Given: An attendee is checked in
When: I click "Undo"
Then: Status reverts to "pending"
And: Timestamp is cleared
And: Statistics update
```

#### 4. Search and Filter
**Scenario:** Finding specific attendee quickly

```
Given: 100+ attendees loaded
When: I type "John" in search
Then: Results filter in real-time
And: Only matching names shown
When: I clear search
Then: All attendees appear again
```

### Feature Tests (P1)

#### 5. Event Management
**Scenario:** Creating and switching events

```
Given: I'm logged in as admin
When: I create event "Gala 2026"
And: I import attendee list
And: I switch to "Gala 2026"
Then: Attendees for "Gala 2026" display
And: Event color scheme applies
```

#### 6. Attendee Management
**Scenario:** Adding attendee manually

```
Given: I'm on event dashboard
When: I click "Add Attendee"
And: I fill in name and email
And: I click "Save"
Then: Attendee appears in list
And: Email is validated
```

#### 7. CSV Import
**Scenario:** Bulk importing attendees

```
Given: I have a CSV file with 50 attendees
When: I upload the file
Then: All valid attendees import
And: Invalid emails are flagged
And: Import summary shows counts
```

### Error Scenarios

#### 8. Network Failure
**Scenario:** Handling offline state

```
Given: I'm checking in attendees
When: Network connection drops
And: I try to check in
Then: Error message displays
And: Check-in saved locally
When: Connection restores
Then: Check-in syncs automatically
```

#### 9. Invalid Data
**Scenario:** Handling bad input

```
Given: I'm adding an attendee
When: I enter invalid email "notanemail"
And: I try to save
Then: Validation error shows
And: Form does not submit
And: Helpful error message displays
```

#### 10. Concurrent Updates
**Scenario:** Two users update same attendee

```
Given: Two users viewing same event
When: User A checks in attendee
And: User B tries to check in same attendee
Then: User B sees already checked-in status
And: No data conflict occurs
```

---

## 🚀 Running Tests

### Local Development

**1. Unit Tests**
```bash
# Open in browser
open test-runner.html

# Or via local server
python -m http.server 8000
# Then navigate to: http://localhost:8000/test-runner.html
```

**2. Integration/E2E Tests via Claude Code**
```
# In Claude Code conversation:
"Run Playwright tests for the check-in flow"

# Claude will use MCP tools to:
# 1. Start browser
# 2. Navigate to app
# 3. Execute test steps
# 4. Report results
```

**3. Manual Testing Checklist**
See `QA-CHECKLIST.md` for comprehensive manual test cases

### Pre-Deployment Testing

Before deploying to production:

```bash
# 1. Run all unit tests
open test-runner.html

# 2. Request comprehensive test via Claude Code
"Run full E2E test suite using Playwright MCP covering:
- Check-in flow
- Multi-device sync
- Event management
- Attendee management
- Error handling
- Security tests"

# 3. Manual security audit
# - Test XSS prevention
# - Test SQL injection prevention
# - Verify authentication required
# - Check HTTPS enforcement

# 4. Performance testing
# - Load test with 500+ attendees
# - Test on slow network (3G)
# - Verify mobile responsiveness
```

---

## 🔄 CI/CD Integration

### GitHub Actions (Future)

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run unit tests
        run: |
          npm install -g http-server
          http-server . -p 8000 &
          npx playwright test tests/unit/

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Supabase
        run: npx supabase start
      - name: Run integration tests
        run: npx playwright test tests/integration/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E tests
        run: npx playwright test tests/e2e/
```

---

## 📊 Test Coverage Goals

### Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| Email Validation | 100% | 100% ✅ |
| Data Sources | 80% | 60% 🚧 |
| Authentication | 90% | 90% ✅ |
| Check-in Flow | 90% | 40% 📝 |
| Event Management | 80% | 0% 📝 |
| Attendee Management | 80% | 0% 📝 |

### Priority Areas

1. **P0 - MVP Blockers**
   - Check-in flow (complete coverage)
   - Real-time sync (multi-device)
   - Security features (XSS, SQL injection)

2. **P1 - v1.1 Features**
   - Event CRUD operations
   - Attendee CRUD operations
   - CSV import/export

3. **P2 - Future Features**
   - Offline support
   - QR code scanning
   - Analytics

---

## 🐛 Bug Reporting

### Test Failure Template

```markdown
## Test Failure Report

**Test:** [Test name]
**File:** [Test file path]
**Status:** Failed ❌

**Expected:**
[What should happen]

**Actual:**
[What actually happened]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Screenshots:**
[Attach screenshots if available]

**Environment:**
- Browser: [Chrome 120]
- OS: [macOS 14]
- URL: [http://localhost:8000]

**Error Message:**
```
[Error stack trace]
```

**Suggested Fix:**
[If known]
```

---

## 📚 Additional Resources

### Testing Guides
- `QA-CHECKLIST.md` - Manual testing checklist
- `.claude/plans/01-check-in-interface.md` - Feature test cases
- `.claude/plans/02-event-management.md` - Event test cases
- `.claude/plans/03-attendee-management.md` - Attendee test cases

### External Resources
- [Playwright Documentation](https://playwright.dev/)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Maintained by:** Development Team
**Review Schedule:** Updated with each feature release
**Questions:** Refer to feature plan test sections for specific test cases
