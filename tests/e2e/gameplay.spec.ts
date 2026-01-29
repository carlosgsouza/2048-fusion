import { test, expect } from '@playwright/test';

test.describe('2048 Fusion', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load the game with title and score', async ({ page }) => {
        await expect(page.locator('.title-digits')).toBeVisible();
        await expect(page.locator('#score')).toHaveText('0');
    });

    test('should start a new game when clicking the button', async ({ page }) => {
        const initialTiles = await page.locator('.tile').count();
        expect(initialTiles).toBe(2);

        await page.click('#new-game');
        const newTiles = await page.locator('.tile').count();
        expect(newTiles).toBe(2);
    });

    test('should change theme', async ({ page }) => {
        await page.selectOption('#theme', 'terminal');
        await expect(page.locator('body')).toHaveClass(/theme-terminal/);
    });
});
