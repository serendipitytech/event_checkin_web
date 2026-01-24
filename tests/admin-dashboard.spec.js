/**
 * Admin Dashboard Tests
 *
 * Tests for admin dashboard functionality including:
 * - System status checks
 * - Attendee statistics display
 * - Reset check-ins functionality
 * - Data source configuration
 *
 * Run with: npx playwright test tests/admin-dashboard.spec.js
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = 'http://localhost:8000';
const ADMIN_URL = `${BASE_URL}/admin.html`;

test.describe('Admin Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to admin dashboard
        await page.goto(ADMIN_URL);

        // Wait for config to load
        await page.waitForFunction(() => window.EventCheckinConfig !== undefined);
    });

    test('should display System Status as Online with Supabase', async ({ page }) => {
        // Wait for system status to load
        await page.waitForSelector('#systemStatus', { timeout: 10000 });

        // Check for success indicator
        const statusText = await page.locator('#systemStatus').textContent();
        expect(statusText).toContain('System Online');
        expect(statusText).toContain('Supabase connection active');

        // Verify success indicator is present
        const successIndicator = await page.locator('#systemStatus .status-indicator.status-success');
        await expect(successIndicator).toBeVisible();
    });

    test('should display correct attendee statistics', async ({ page }) => {
        // Wait for attendee stats to load
        await page.waitForSelector('#attendeeStats', { timeout: 10000 });

        // Check that stats are displayed
        const statsText = await page.locator('#attendeeStats').textContent();
        expect(statsText).toContain('Total');
        expect(statsText).toContain('Checked In');
        expect(statsText).toContain('Pending');

        // Verify numbers are displayed (should have numeric values)
        const totalCount = await page.locator('#attendeeStats').getByText('Total').locator('..').locator('div').first().textContent();
        expect(parseInt(totalCount)).toBeGreaterThanOrEqual(0);
    });

    test('should reset check-ins when button is clicked', async ({ page }) => {
        // Find and click the reset button (may need to navigate to correct tab)
        // Note: This test assumes reset button is accessible

        // Set up dialog handler
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Reset all check-ins');
            await dialog.accept();
        });

        // Set up alert handler
        let alertShown = false;
        page.on('dialog', async dialog => {
            if (dialog.type() === 'alert') {
                expect(dialog.message()).toContain('reset');
                alertShown = true;
                await dialog.accept();
            }
        });

        // Click reset button (update selector as needed)
        // await page.click('button:has-text("Reset Check-ins")');

        // Verify alert was shown
        // expect(alertShown).toBe(true);

        // TODO: Implement after verifying button selector
    });

    test('should show Supabase data source configuration', async ({ page }) => {
        // Wait for data source status
        await page.waitForSelector('#dataSourceStatus', { timeout: 10000 });

        const dataSourceText = await page.locator('#dataSourceStatus').textContent();
        expect(dataSourceText).toContain('SUPABASE');
        expect(dataSourceText).toContain('Supabase Database');
    });

    test('should not show errors in System Status', async ({ page }) => {
        // Wait for system status
        await page.waitForSelector('#systemStatus', { timeout: 10000 });

        // Verify no error indicator
        const errorIndicator = await page.locator('#systemStatus .status-indicator.status-error').count();
        expect(errorIndicator).toBe(0);
    });

    test('should not show errors in Attendee Stats', async ({ page }) => {
        // Wait for attendee stats
        await page.waitForSelector('#attendeeStats', { timeout: 10000 });

        // Verify no error indicator
        const errorIndicator = await page.locator('#attendeeStats .status-indicator.status-error').count();
        expect(errorIndicator).toBe(0);
    });

    test('should load within reasonable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto(ADMIN_URL);
        await page.waitForSelector('#systemStatus');
        await page.waitForSelector('#attendeeStats');

        const loadTime = Date.now() - startTime;

        // Should load in under 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });
});
