import { test, expect } from '@playwright/test';

test.describe('Storefront Smoke Tests', () => {
  test('homepage loads and displays main components', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Sree Gopi Traders/i);

    // Check if the main navigation exists
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Check if hero section or main heading exists
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();
  });

  test('catalog navigation', async ({ page }) => {
    await page.goto('/');

    // Look for a link to products/catalog
    const shopLink = page.locator('a[href*="/products"], a[href*="/catalog"], a:has-text("Shop")').first();
    
    if (await shopLink.isVisible()) {
      await shopLink.click();
      
      // Should navigate to catalog page
      await expect(page).toHaveURL(/.*(products|catalog).*/);
      
      // Should display some products
      const products = page.locator('a[href*="/products/"]');
      if (await products.count() > 0) {
        await expect(products.first()).toBeVisible();
      }
    } else {
      console.log('Shop link not found on homepage, skipping navigation test');
    }
  });
});
