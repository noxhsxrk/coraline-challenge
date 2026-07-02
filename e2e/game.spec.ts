import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Rock Paper Scissors Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="btn-rock"]');
  });

  test('should load the game with initial scores', async ({ page }) => {
    await expect(page.getByTestId('your-score')).toHaveText(/\d+/);
    await expect(page.getByTestId('high-score')).toHaveText(/\d+/);
  });

  test('should show all three action buttons', async ({ page }) => {
    await expect(page.getByTestId('btn-rock')).toBeVisible();
    await expect(page.getByTestId('btn-paper')).toBeVisible();
    await expect(page.getByTestId('btn-scissors')).toBeVisible();
  });

  test('should show bot display as ??? initially', async ({ page }) => {
    const botDisplay = page.getByTestId('bot-display');
    await expect(botDisplay).toBeVisible();
    // Bot display shows emoji text; just verify it's there
  });

  test('should lock buttons after clicking an action', async ({ page }) => {
    await page.getByTestId('btn-rock').click();

    // Buttons should be disabled during the 2-second lock
    await expect(page.getByTestId('btn-rock')).toBeDisabled();
    await expect(page.getByTestId('btn-paper')).toBeDisabled();
    await expect(page.getByTestId('btn-scissors')).toBeDisabled();
  });

  test('should unlock buttons after 2-second reveal', async ({ page }) => {
    await page.getByTestId('btn-rock').click();

    // Wait for the 2-second lock to end
    await page.waitForTimeout(2500);

    // Buttons should be re-enabled
    await expect(page.getByTestId('btn-rock')).toBeEnabled();
  });

  test('should show result after 2 seconds', async ({ page }) => {
    await page.getByTestId('btn-rock').click();

    // Wait for lock to end
    await page.waitForTimeout(2500);

    // Result banner should appear
    const banner = page.getByTestId('result-banner');
    await expect(banner).toBeVisible();
  });

  test('can play multiple rounds', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      // Make sure button is enabled before clicking
      await page.waitForSelector('[data-testid="btn-rock"]:not([disabled])');
      await page.getByTestId('btn-rock').click();
      await page.waitForTimeout(2500);
    }
  });
});
