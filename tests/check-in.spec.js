/**
 * Check-in Functionality Tests
 *
 * Tests for main check-in interface including:
 * - Attendee list display
 * - Check-in/undo functionality
 * - Statistics updates
 * - Search and filtering
 * - Real-time sync
 *
 * Run with: npx playwright test tests/check-in.spec.js
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = 'http://localhost:8000';
const CHECK_IN_URL = `${BASE_URL}/index.html`;

test.describe('Check-in Interface', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to check-in page
        await page.goto(CHECK_IN_URL);

        // Wait for data to load
        await page.waitForFunction(() => {
            const list = document.getElementById('attendeeList');
            return list && list.children.length > 0;
        }, { timeout: 10000 });
    });

    test('should display attendee list', async ({ page }) => {
        // Verify attendee list is visible
        const attendeeList = page.locator('#attendeeList');
        await expect(attendeeList).toBeVisible();

        // Verify attendee cards are displayed
        const attendeeCards = page.locator('.attendee-item');
        const count = await attendeeCards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should check in an attendee successfully', async ({ page }) => {
        // Get initial statistics
        const initialStats = await page.locator('#checkedInCount').textContent();
        const initialCheckedIn = parseInt(initialStats.match(/\d+/)?.[0] || '0');

        // Find first pending attendee and click check-in
        const checkInButton = page.locator('.check-button.check-in').first();
        await checkInButton.click();

        // Wait for update
        await page.waitForTimeout(500);

        // Verify button changed to "Undo"
        await expect(checkInButton).toContainText('Undo');

        // Verify statistics updated
        const newStats = await page.locator('#checkedInCount').textContent();
        const newCheckedIn = parseInt(newStats.match(/\d+/)?.[0] || '0');
        expect(newCheckedIn).toBe(initialCheckedIn + 1);

        // Verify attendee card has checked-in class
        const attendeeCard = page.locator('.attendee-item.checked-in').first();
        await expect(attendeeCard).toBeVisible();
    });

    test('should undo check-in successfully', async ({ page }) => {
        // First check in an attendee
        const checkInButton = page.locator('.check-button.check-in').first();
        await checkInButton.click();
        await page.waitForTimeout(500);

        // Get statistics after check-in
        const statsAfterCheckIn = await page.locator('#checkedInCount').textContent();
        const checkedInCount = parseInt(statsAfterCheckIn.match(/\d+/)?.[0] || '0');

        // Click undo
        await checkInButton.click();
        await page.waitForTimeout(500);

        // Verify button changed back to "Check In"
        await expect(checkInButton).toContainText('Check In');

        // Verify statistics updated
        const finalStats = await page.locator('#checkedInCount').textContent();
        const finalCount = parseInt(finalStats.match(/\d+/)?.[0] || '0');
        expect(finalCount).toBe(checkedInCount - 1);
    });

    test('should display correct statistics', async ({ page }) => {
        // Verify stats container is visible
        const stats = page.locator('#compactStats');
        await expect(stats).toBeVisible();

        // Verify all stat elements are present
        await expect(page.locator('#checkedInCount')).toBeVisible();
        await expect(page.locator('#totalCount')).toBeVisible();
        await expect(page.locator('#percentageCount')).toBeVisible();
    });

    test('should filter attendees with search', async ({ page }) => {
        // Get total attendees before search
        const totalBefore = await page.locator('.attendee-item').count();

        // Type in search box
        const searchInput = page.locator('#searchInput');
        await searchInput.fill('John');

        // Wait for filter
        await page.waitForTimeout(500);

        // Verify filtered results
        const totalAfter = await page.locator('.attendee-item').count();
        expect(totalAfter).toBeLessThanOrEqual(totalBefore);

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Verify all attendees shown again
        const totalFinal = await page.locator('.attendee-item').count();
        expect(totalFinal).toBe(totalBefore);
    });

    test('should switch between pending and checked-in tabs', async ({ page }) => {
        // Click checked-in tab
        const checkedInTab = page.locator('button.tab-button').filter({ hasText: 'Checked In' });
        await checkedInTab.click();

        // Verify active class
        await expect(checkedInTab).toHaveClass(/active/);

        // Click pending tab
        const pendingTab = page.locator('button.tab-button').filter({ hasText: 'Pending' });
        await pendingTab.click();

        // Verify active class
        await expect(pendingTab).toHaveClass(/active/);
    });

    test('should persist check-in to database', async ({ page }) => {
        // Check in an attendee
        const firstCard = page.locator('.attendee-item').first();
        const attendeeName = await firstCard.locator('.attendee-name').textContent();
        const checkInButton = firstCard.locator('.check-button');
        await checkInButton.click();

        // Wait for database update
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload();

        // Wait for data to load
        await page.waitForFunction(() => {
            const list = document.getElementById('attendeeList');
            return list && list.children.length > 0;
        });

        // Verify attendee is still checked in
        const attendeeCard = page.locator('.attendee-item').filter({ hasText: attendeeName });
        await expect(attendeeCard).toHaveClass(/checked-in/);
    });

    test('should display data source indicator', async ({ page }) => {
        // Verify data source indicator shows SUPABASE
        const indicator = page.locator('#dataSourceIndicator');
        await expect(indicator).toContainText('SUPABASE');
    });

    test('should load page within reasonable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto(CHECK_IN_URL);
        await page.waitForSelector('#attendeeList .attendee-item');

        const loadTime = Date.now() - startTime;

        // Should load in under 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });
});
