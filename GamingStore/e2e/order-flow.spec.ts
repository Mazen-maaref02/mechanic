import { test, expect } from "@playwright/test";
import { ADMIN, importKeysForVariant, login } from "./helpers";

const GUEST = { name: "Mazen Test", email: "guest+e2e@tunixpay.test", phone: "+216 20 123 456" };

const proofRef = () => `TRX-E2E-${Date.now().toString(36).toUpperCase()}`;

test.describe.serial("guest checkout â†’ manual verification â†’ key delivery", () => {
  let orderUrl: string | null = null;
  let proofRefUsed = "";

  test("admin imports encrypted keys via inventory", async ({ page }) => {
    const keys = await importKeysForVariant(
      page,
      "Steam Wallet Gift Card â€” $10 USD (SW-USD-10)",
      3,
    );
    expect(keys.length).toBe(3);
  });

  test("guest places an order without any account and submits a payment reference", async ({ page }) => {
    await page.goto("/product/steam-wallet-gift-card");

    // Add to cart stays on the page; the cart page drives checkout navigation.
    // Wait for hydration: dev-mode React attaches listeners shortly after load,
    // and a too-early click would be swallowed.
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: /open cart \(1 items?\)/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.goto("/cart");
    await page.getByRole("button", { name: /continue to checkout/i }).click();
    await page.waitForURL(/\/checkout/, { timeout: 20_000 });

    // guest contact details (no account created anywhere)
    await page.getByLabel(/full name/i).fill(GUEST.name);
    await page.getByLabel(/email/i).fill(GUEST.email);
    await page.getByLabel(/phone/i).fill(GUEST.phone);
    const submit = page.getByRole("button", { name: /place order/i });
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.click();

    await page.waitForURL(/\/payment\/.*email=/, { timeout: 20_000 });
    orderUrl = page.url();
    expect(orderUrl).toContain(`email=${encodeURIComponent(GUEST.email)}`);

    // manual-method registration: reference only â€” nothing auto-verifies it
    proofRefUsed = proofRef();
    await page.locator("input[name='reference']").fill(proofRefUsed);
    await page.getByRole("button", { name: /submit payment reference/i }).click();
    await expect(page.getByText(/payment reference registered/i)).toBeVisible({ timeout: 20_000 });
  });

  test("admin sees the submission in the queue and verifies it", async ({ browser }) => {
    expect(orderUrl, "previous step must have produced an order").toBeTruthy();
    const orderId = orderUrl!.split("/payment/")[1]!.split("?")[0];

    // fresh admin context (guest checkout never had a session)
    const adminPage = await browser.newPage();
    await login(adminPage, ADMIN, "/admin/payments");
    await adminPage.goto("/admin/payments");

    const card = adminPage.locator("article").filter({ hasText: proofRefUsed });
    await expect(card.first()).toBeVisible({ timeout: 20_000 });

    const queueRow = adminPage.locator(`a[href='/admin/orders/${orderId}']`).first();
    await expect(queueRow).toBeVisible();

    await adminPage.getByRole("button", { name: /verify payment/i }).first().click();
    await expect(
      adminPage.getByText(/verified & delivered|payment verified/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await adminPage.close();
  });

  test("guest tracks the order by number + email and sees the decrypted key", async ({ page }) => {
    expect(orderUrl).toBeTruthy();
    const orderId = orderUrl!.split("/payment/")[1]!.split("?")[0];

    const trackUrl = `/track-order?email=${encodeURIComponent(GUEST.email)}`;
    const response = await page.goto(trackUrl);
    expect(response).toBeTruthy();

    // first look up the order number from the payment page â€” the guest saved it
    await page.goto(orderUrl!);
    const heading = await page.locator("h1").first().textContent();
    const orderNumber = heading?.match(/GS-[A-Z0-9-]+/)?.[0];
    expect(orderNumber, "payment page must show the order number").toBeTruthy();

    await page.goto(`/track-order?number=${encodeURIComponent(orderNumber!)}&email=${encodeURIComponent(GUEST.email)}`);
    const status = page.getByText(/completed|processing|payment_verified/i).first();
    await expect(status).toBeVisible({ timeout: 20_000 });
    void orderId;

    // the delivered key is masked until the guest reveals it
    await page.getByRole("button", { name: /reveal key/i }).first().click();
    await expect(page.getByText(/STEAMKEY-E2E-/, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
