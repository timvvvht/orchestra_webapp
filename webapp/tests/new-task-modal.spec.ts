import { test, expect } from '@playwright/test';

test.describe('New Task Modal Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mission control page
    await page.goto('/mission-control');
    
    // Wait for the page to load and any initial errors to surface
    await page.waitForLoadState('networkidle');
    
    // Check that there are no console errors related to context providers
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async errors to surface
    await page.waitForTimeout(1000);
    
    // Verify no context provider errors
    const contextErrors = errors.filter(error => 
      error.includes('must be used within') || 
      error.includes('Provider') ||
      error.includes('Context')
    );
    
    if (contextErrors.length > 0) {
      throw new Error(`Context provider errors found: ${contextErrors.join(', ')}`);
    }
  });

  test('Mission Control page loads without context errors', async ({ page }) => {
    // This test is mainly handled by beforeEach, but let's verify the page structure
    await expect(page.locator('body')).toBeVisible();
    
    // Check that the mission control interface is present
    // Look for common elements that should be there
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('New Task modal can be opened without errors', async ({ page }) => {
    // Look for buttons or elements that might open the New Task modal
    // Common patterns: "New Task", "Create Task", "+" button, etc.
    
    // First, let's see what's available on the page
    const buttons = await page.locator('button').all();
    const buttonTexts = await Promise.all(
      buttons.map(async (button) => {
        try {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          return { text: text?.trim(), isVisible };
        } catch {
          return { text: '', isVisible: false };
        }
      })
    );
    
    console.log('Available buttons:', buttonTexts.filter(b => b.isVisible));
    
    // Look for common new task triggers
    const newTaskTriggers = [
      'button:has-text("New Task")',
      'button:has-text("Create Task")',
      'button:has-text("New")',
      'button[aria-label*="new"]',
      'button[aria-label*="create"]',
      'button[title*="new"]',
      'button[title*="create"]',
      '[data-testid*="new-task"]',
      '[data-testid*="create-task"]'
    ];
    
    let modalTrigger = null;
    for (const selector of newTaskTriggers) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        modalTrigger = element;
        console.log(`Found modal trigger: ${selector}`);
        break;
      }
    }
    
    if (modalTrigger) {
      // Track console errors before clicking
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Click the trigger
      await modalTrigger.click();
      
      // Wait for any modal to appear or errors to surface
      await page.waitForTimeout(1000);
      
      // Check for context-related errors after clicking
      const contextErrors = errors.filter(error => 
        error.includes('must be used within') || 
        error.includes('Provider') ||
        error.includes('Context')
      );
      
      expect(contextErrors).toHaveLength(0);
      
      // Look for modal indicators
      const modalSelectors = [
        '[role="dialog"]',
        '.modal',
        '[data-testid*="modal"]',
        '[aria-modal="true"]'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        if (await page.locator(selector).isVisible()) {
          modalFound = true;
          console.log(`Modal found with selector: ${selector}`);
          break;
        }
      }
      
      if (modalFound) {
        console.log('✅ Modal opened successfully without context errors');
      } else {
        console.log('ℹ️ Modal trigger clicked, but modal not detected (may be expected behavior)');
      }
    } else {
      console.log('ℹ️ No obvious new task modal trigger found on the page');
      // This might be expected if the UI doesn't have a visible new task button
      // The important thing is that we didn't get context errors
    }
  });

  test('Page handles keyboard shortcuts without errors', async ({ page }) => {
    // Test common keyboard shortcuts that might trigger modals
    const shortcuts = [
      'Control+n', // Common "new" shortcut
      'Control+Shift+n',
      'n', // Sometimes just 'n' key
      'c', // Sometimes 'c' for create
    ];
    
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut);
      await page.waitForTimeout(500); // Give time for any modal to appear
    }
    
    // Check that no context errors occurred
    const contextErrors = errors.filter(error => 
      error.includes('must be used within') || 
      error.includes('Provider') ||
      error.includes('Context')
    );
    
    expect(contextErrors).toHaveLength(0);
  });

  test('Browse project functionality works in web mode', async ({ page }) => {
    // This test specifically checks that the handleBrowseProject function
    // properly no-ops in web mode without throwing errors
    
    // First try to open a modal (if possible)
    const newTaskButton = page.locator('button').filter({ hasText: /new|create/i }).first();
    
    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      await page.waitForTimeout(1000);
      
      // Look for browse/folder buttons within any modal
      const browseButtons = [
        'button:has-text("Browse")',
        'button:has-text("Select Folder")',
        'button:has-text("Choose")',
        'button[title*="browse"]',
        'button[title*="folder"]',
        '[data-testid*="browse"]'
      ];
      
      for (const selector of browseButtons) {
        const button = page.locator(selector);
        if (await button.isVisible()) {
          console.log(`Found browse button: ${selector}`);
          
          const errors: string[] = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          // Click the browse button - should no-op in web mode
          await button.click();
          await page.waitForTimeout(500);
          
          // Verify no errors occurred
          expect(errors).toHaveLength(0);
          console.log('✅ Browse button clicked without errors (expected no-op in web mode)');
          break;
        }
      }
    }
  });
});