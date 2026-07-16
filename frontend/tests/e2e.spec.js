import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('ArenaMind E2E Automated Suite (Plagiarism-Free Context)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Mock Venue Graph API globally
    await page.route('**/api/v1/fan/venue-graph', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ nodes: [], edges: [] })
    }));

    // 2. Mock Process Query API globally
    await page.route('**/api/v1/fan/process-query', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        structured_content: "Walk carefully to your destination.",
        raw_path: ["Gate North", "Concourse B", "Section 305"],
        exploration_steps: [],
        pruned_edges: []
      })
    }));

    // 3. Mock Triage Radio API globally
    await page.route('**/api/v1/volunteer/process-request', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        priority_level: "CRITICAL",
        required_staff_role: "Medical Responder Unit",
        translated_english_summary: "Severe medical emergency detected."
      })
    }));

    // 4. Mock Simulate Density API globally
    await page.route('**/api/v1/crowd/evaluate-sector*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sector_id: "TEST-SECTOR",
        severity_level: "CRITICAL",
        digital_signage_message: "Please use alternative exits."
      })
    }));
  });

  test.describe('Fan Interactions & Topology Validation', () => {
    test('Dijkstra wayfinding logic visualizes locked route', async ({ page }) => {
      await page.goto('/fan/wayfinding');
      await page.locator('select').nth(1).selectOption('Gate North');
      await page.locator('select').nth(2).selectOption('Section 205');
      await page.getByRole('button', { name: 'Execute Pathfinding Math' }).click();
      await expect(page.getByText('Route Locked')).toBeVisible({ timeout: 15000 });
    });

    test('Dark mode toggle dynamically injects CSS class', async ({ page }) => {
      await page.goto('/fan/wayfinding');
      let initialClass = await page.evaluate(() => document.body.className);
      expect(initialClass).not.toContain('dark-theme');
      await page.locator('.theme-toggle-btn').click();
      let updatedClass = await page.evaluate(() => document.body.className);
      expect(updatedClass).toContain('dark-theme');
    });

    test('Carbon offset simulation handles calculation states', async ({ page }) => {
      await page.goto('/fan/transit');
      await page.locator('input[type="number"]').fill('25');
      await page.locator('select').nth(1).selectOption('Metro / Bus (Public Transit)');
      await page.getByRole('button', { name: 'Execute Impact Analysis' }).click();
      await expect(page.getByText('Calculating carbon offsets and processing alternative routes...')).not.toBeVisible({ timeout: 15000 });
      await expect(page.locator('.bento-panel').nth(1)).not.toHaveText(/Awaiting parameters/i);
    });
  });

  test.describe('Dashboard Mission Control Workflows', () => {
    test('Telemetry sliders trigger capacity alerts', async ({ page }) => {
      await page.goto('/dashboard');
      const targetRow = page.locator('tr').filter({ hasText: 'GATE-NORTH' });
      await expect(targetRow.getByText('20.0%')).toBeVisible();
      const rangeInput = targetRow.locator('input[type="range"]');
      await rangeInput.fill('950');
      await rangeInput.dispatchEvent('mouseup');
      await expect(targetRow.getByText('95.0%')).toBeVisible();
      const statusPill = targetRow.locator('.status-tag');
      await expect(statusPill).toHaveText('ROUTING ACTIVE');
      await expect(statusPill).toHaveClass(/tag-critical/);
    });

    test('AI volunteer triage dispatcher handles emergency transcripts', async ({ page }) => {
      await page.goto('/dashboard');
      const radioBox = page.getByPlaceholder('Field Agent Radio: Type emergency here...');
      await radioBox.fill('Officer down at gate 4!');
      await page.locator('button.radio-submit').click();
      await expect(page.getByText(/Critical|High|Emergency/i).first()).toBeVisible({ timeout: 15000 });
      const logs = page.locator('.feed-item');
      await expect(logs).toHaveCount(1, { timeout: 15000 });
    });
  });

  test.describe('Axe-Core Automated WCAG Audits', () => {
    test('Wayfinding interface passes strict accessibility constraints', async ({ page }) => {
      await page.goto('/fan/wayfinding');
      const scanResults = await new AxeBuilder({ page }).analyze();
      expect(scanResults.violations).toEqual([]);
    });

    test('Staff command center passes strict accessibility constraints', async ({ page }) => {
      await page.goto('/dashboard');
      const scanResults = await new AxeBuilder({ page }).analyze();
      expect(scanResults.violations).toEqual([]);
    });
  });
});
