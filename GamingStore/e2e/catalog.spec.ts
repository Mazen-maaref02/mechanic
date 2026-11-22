import { test, expect } from "@playwright/test";

test.describe("catalog storefront", () => {
  test("home page renders hero + featured products", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NexLevel/i);
    await expect(page.getByText(/gift/i).first()).toBeVisible();
  });

  test("shop listing shows seeded products", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText("Steam Wallet Gift Card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Red Dead Redemption 2 — Steam Key")).toBeVisible();
  });

  test("product detail exposes variants and buy controls", async ({ page }) => {
    await page.goto("/product/steam-wallet-gift-card");
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy now" })).toBeVisible();
    // variant labels from seed
    await expect(page.getByText("$10 USD").first()).toBeVisible();
  });

  test("physical routes respond 404 with branded page", async ({ page }) => {
    await page.goto("/product/this-product-does-not-exist");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
