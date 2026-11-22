import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@gamingstore.dev", password: "Admin123!" };
export const CUSTOMER = { email: "customer@gamingstore.dev", password: "Customer123!" };

export async function login(
  page: Page,
  creds: { email: string; password: string },
  next = "/account",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).first().fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

export async function isLoggedIn(page: Page, email: string) {
  await page.goto("/account");
  await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 15_000 });
}

/**
 * Signs in with the seeded admin and imports `count` synthetic keys for the
 * given variant via the real admin Inventory UI (exercises importKeysAction
 * + AES-256-GCM encryption end-to-end). Returns the plaintext keys imported.
 */
export async function importKeysForVariant(page: Page, variantLabel: string, count: number) {
  const keys = Array.from({ length: count }, (_, i) => `STEAMKEY-E2E-${Date.now().toString(36).toUpperCase()}-${i}`);
  await login(page, ADMIN, "/admin/inventory");
  await page.goto("/admin/inventory");

  const select = page.locator("section[aria-label='Import keys'] select");
  await select.selectOption({ label: variantLabel });

  const textarea = page.locator("section[aria-label='Import keys'] textarea");
  await textarea.fill(keys.join("\n"));
  await page.getByRole("button", { name: /^Import$/ }).click();
  await expect(page.getByText(/imported .* key/i)).toBeVisible({ timeout: 20_000 });

  return keys;
}
