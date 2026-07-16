import { test, expect } from '@playwright/test';

test.describe('ArenaMind E2E Test Suite', () => {
  
  test.describe('Fan Portal Operations', () => {
    test('Wayfinding logic and map render', async ({ page }) => {
      // Navigate to the wayfinding page
      await page.goto('/fan/wayfinding');
      
      // Select origin and destination
      await page.locator('select').nth(1).selectOption('Gate North');
      await page.locator('select').nth(2).selectOption('Section 205');
      
      // Execute Pathfinding Math
      await page.getByRole('button', { name: 'Execute Pathfinding Math' }).click();
      
      // Verify loading state appears
      await expect(page.getByText('Analyzing edges and calculating shortest path...')).toBeVisible();
      
      // Verify the map overlay updates to "Route Locked" (implies backend response succeeded)
      await expect(page.getByText('Route Locked')).toBeVisible({ timeout: 15000 });
    });

    test('Theme toggle triggers CSS class on body', async ({ page }) => {
      await page.goto('/fan/wayfinding');
      
      // Initially, dark-theme should not be there (it's light mode by default)
      let bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).not.toContain('dark-theme');
      
      // Click the theme toggle button (Sun/Moon icon)
      await page.locator('.theme-toggle-btn').click();
      
      // Verify dark-theme is applied
      bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).toContain('dark-theme');
    });

    test('Transit module carbon calculator', async ({ page }) => {
      await page.goto('/fan/transit');
      
      // Input distance
      await page.locator('input[type="number"]').fill('25');
      // Select transit mode
      await page.locator('select').nth(1).selectOption('Metro / Bus (Public Transit)');
      
      // Execute
      await page.getByRole('button', { name: 'Execute Impact Analysis' }).click();
      
      // Wait for the loading spinner to disappear and result to show
      await expect(page.getByText('Calculating carbon offsets and processing alternative routes...')).not.toBeVisible({ timeout: 15000 });
      // The output container should now have text
      await expect(page.locator('.bento-panel').nth(1)).not.toHaveText(/Awaiting parameters/i);
    });
  });

  test.describe('Staff Dashboard Operations', () => {
    test('Capacity slider updates status correctly', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check the Gate North row. Initial capacity 20%
      const gateNorthRow = page.locator('tr').filter({ hasText: 'GATE-NORTH' });
      await expect(gateNorthRow.getByText('20.0%')).toBeVisible();
      
      // Note: testing HTML5 range sliders in Playwright requires dispatching events or filling the input
      const slider = gateNorthRow.locator('input[type="range"]');
      await slider.fill('950');
      await slider.dispatchEvent('mouseup');
      
      // Verify the text changes to 95%
      await expect(gateNorthRow.getByText('95.0%')).toBeVisible();
      
      // Verify the status tag changes to ROUTING ACTIVE
      const statusTag = gateNorthRow.locator('.status-tag');
      await expect(statusTag).toHaveText('ROUTING ACTIVE');
      await expect(statusTag).toHaveClass(/tag-critical/);
    });

    test('Field Agent Radio dispatches and processes emergency', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Locate the radio input
      const radioInput = page.getByPlaceholder('Field Agent Radio: Type emergency here...');
      
      // Send an emergency message
      await radioInput.fill('Medical emergency! A fan collapsed near Section 105. Need EMTs immediately!');
      await page.locator('button.radio-submit').click();
      
      // Wait for the triage result
      await expect(page.getByText(/Critical|High|Emergency/i)).toBeVisible({ timeout: 15000 });
      
      // Check that the history feed adds an entry
      const historyItems = page.locator('.feed-item');
      await expect(historyItems).toHaveCount(1, { timeout: 15000 });
    });
  });

});
