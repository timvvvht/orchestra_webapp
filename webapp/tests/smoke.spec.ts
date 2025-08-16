import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Error Detection', () => {
  let consoleErrors: string[] = [];
  let pageErrors: Error[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays for each test
    consoleErrors = [];
    pageErrors = [];
    networkFailures = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for unhandled page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Listen for network request failures
    page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        networkFailures.push(`${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Listen for failed requests
    page.on('requestfailed', (request) => {
      networkFailures.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Landing page should load without errors', async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for console errors
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);

    // Check for page errors
    expect(pageErrors, `Page errors found: ${pageErrors.map(e => e.message).join(', ')}`).toHaveLength(0);

    // Check for network failures
    expect(networkFailures, `Network failures found: ${networkFailures.join(', ')}`).toHaveLength(0);

    // Verify the page loaded successfully
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
  });

  test('Mission Control page should load without errors', async ({ page }) => {
    // Navigate to the Mission Control page
    await page.goto('/mission-control');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for console errors
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);

    // Check for page errors
    expect(pageErrors, `Page errors found: ${pageErrors.map(e => e.message).join(', ')}`).toHaveLength(0);

    // Check for network failures
    expect(networkFailures, `Network failures found: ${networkFailures.join(', ')}`).toHaveLength(0);

    // Verify the page loaded successfully
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
  });

  test('Application should handle navigation without errors', async ({ page }) => {
    // Start at landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clear any initial errors
    consoleErrors = [];
    pageErrors = [];
    networkFailures = [];

    // Navigate to Mission Control
    await page.goto('/mission-control');
    await page.waitForLoadState('networkidle');

    // Navigate back to landing
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for console errors during navigation
    expect(consoleErrors, `Console errors during navigation: ${consoleErrors.join(', ')}`).toHaveLength(0);

    // Check for page errors during navigation
    expect(pageErrors, `Page errors during navigation: ${pageErrors.map(e => e.message).join(', ')}`).toHaveLength(0);

    // Check for network failures during navigation
    expect(networkFailures, `Network failures during navigation: ${networkFailures.join(', ')}`).toHaveLength(0);
  });

  test.afterEach(async ({ page }) => {
    // Log any errors found for debugging
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page Errors:', pageErrors.map(e => e.message));
    }
    if (networkFailures.length > 0) {
      console.log('Network Failures:', networkFailures);
    }
  });
});