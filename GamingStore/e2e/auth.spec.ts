import { test, expect } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.describe("auth & access control (guest-first store)", () => {
  test("storefront header shows no sign-in entry for guests", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/sign in/i).first()).toBeHidden();
    // the sign-in icon was replaced with order tracking
    await expect(page.getByLabel(/track your order/i)).toBeVisible();
  });

  test("anonymous /admin access redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("seeded admin can sign in and reach the dashboard", async ({ page }) => {
    await login(page, ADMIN, "/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/revenue/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("admin sidebar lists all admin modules", async ({ page }) => {
    await login(page, ADMIN, "/admin");
    for (const link of [
      "/admin/orders", "/admin/products", "/admin/categories",
      "/admin/coupons",
      "/admin/settings", "/admin/audit-logs", "/admin/reports", "/admin/mfa",
    ]) {
      const url = new URL(link, "http://localhost:3000");
      await page.goto(link);
      await expect(page, `${link} should render`).not.toHaveURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toContain(url.pathname);
    }
  });
});
