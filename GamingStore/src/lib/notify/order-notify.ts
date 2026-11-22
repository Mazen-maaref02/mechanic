/**
 * Order notifications — "formulaire" email (Brevo) + WhatsApp text (CallMeBot).
 *
 * Design contract (AGENTS.md #9 — server-first, never break orders):
 *  - Pure builders are exported for unit tests (no env access in them).
 *  - Sends are ENV-GATED: missing BREVO_API_KEY / CALLMEBOT_API_KEY skips
 *    silently instead of failing.
 *  - dispatchOrderNotice() never throws; per-call failures are only logged.
 *  - Callers schedule this via `after()` (post-response, non-blocking).
 *
 * Env variables used (all optional):
 *  - BREVO_API_KEY         Brevo v3 API key (xkey-…)
 *  - NOTIFY_EMAIL_TO       owner inbox (where the order form lands)
 *  - NOTIFY_EMAIL_FROM     verified Brevo sender (defaults to NOTIFY_EMAIL_TO)
 *  - CALLMEBOT_API_KEY     CallMeBot apiKey for the owner's WhatsApp
 *  - NOTIFY_WHATSAPP_TO    WhatsApp number in international digits, no "+" (e.g. 21654471843)
 */

import { formatPrice, type CurrencyCode } from "@/lib/money";

export type NoticeKind = "order_placed" | "payment_submitted";

export interface NoticeItem {
  title: string;
  label: string;
  quantity: number;
  lineTotalMinor: number;
}

export interface OrderNotice {
  kind: NoticeKind;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote?: string;
  items: NoticeItem[];
  totalMinor: number;
  currency: CurrencyCode;
  /** Only set for payment_submitted notices. */
  paymentMethod?: string;
  paymentReference?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  cash: "Cash",
  wafacash: "WafaCash",
  other: "Other",
};

const KIND_LABELS: Record<NoticeKind, string> = {
  order_placed: "New order",
  payment_submitted: "Payment submitted",
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const paymentLabel = (method?: string): string =>
  method ? (PAYMENT_LABELS[method] ?? method) : "";

/** Plain-text WhatsApp "form" — CallMeBot supports emojis and newlines. */
export function buildWhatsappText(notice: OrderNotice): string {
  const total = formatPrice(notice.totalMinor, notice.currency);

  const lines = [
    `🛒 TUNIXPAY — ${KIND_LABELS[notice.kind].toUpperCase()}`,
    `📦 Order: ${notice.orderNumber}`,
    "",
    `👤 ${notice.customerName}`,
    `✉️ ${notice.customerEmail}`,
    notice.customerPhone ? `📞 ${notice.customerPhone}` : "",
  ];

  if (notice.items.length > 0) {
    lines.push(
      "",
      "🧾 Items:",
      notice.items
        .map((i) => `• ${i.quantity}× ${i.title} — ${i.label} → ${formatPrice(i.lineTotalMinor, notice.currency)}`)
        .join("\n"),
    );
  }

  lines.push("", `💰 TOTAL: ${total}`);

  if (notice.kind === "payment_submitted") {
    lines.push(
      "",
      `💳 Method: ${paymentLabel(notice.paymentMethod) || "—"}`,
      `🔖 Reference: ${notice.paymentReference || "—"}`,
    );
  } else if (notice.paymentMethod) {
    lines.push("", `💳 Wants to pay with: ${paymentLabel(notice.paymentMethod)}`);
  }

  if (notice.customerNote) {
    lines.push("", `📝 Note: ${notice.customerNote}`);
  }

  return lines.join("\n");
}

/** Styled HTML email "formulaire" for the owner's inbox. */export function buildOrderEmailHtml(notice: OrderNotice): string {
  const total = formatPrice(notice.totalMinor, notice.currency);
  const methodRow = notice.paymentMethod
    ? `
        <tr>
          <td style="padding:8px 14px;color:#94a3b8;font-size:13px;">Wants to pay with</td>
          <td style="padding:8px 14px;font-weight:600;">${escapeHtml(paymentLabel(notice.paymentMethod))}</td>
        </tr>`
    : "";
  const paymentRows =
    notice.kind === "payment_submitted"
      ? `
        ${methodRow}
        <tr>
          <td style="padding:8px 14px;color:#94a3b8;font-size:13px;">Reference</td>
          <td style="padding:8px 14px;font-weight:600;">${escapeHtml(notice.paymentReference || "—")}</td>
        </tr>`
      : methodRow;

  const itemRows = notice.items.length
    ? notice.items
        .map(
          (i) => `
        <tr>
          <td style="padding:8px 14px;border-top:1px solid #1e2a44;">
            <strong>${escapeHtml(i.title)}</strong>
            <span style="color:#94a3b8;"> — ${escapeHtml(i.label)}</span>
          </td>
          <td style="padding:8px 14px;border-top:1px solid #1e2a44;text-align:center;">${i.quantity}</td>
          <td style="padding:8px 14px;border-top:1px solid #1e2a44;text-align:right;">${formatPrice(i.lineTotalMinor, notice.currency)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" style="padding:8px 14px;border-top:1px solid #1e2a44;color:#94a3b8;">No line items recorded.</td></tr>`;

  const noteBlock = notice.customerNote
    ? `<tr>
          <td style="padding:8px 14px;color:#94a3b8;font-size:13px;vertical-align:top;">Customer note</td>
          <td style="padding:8px 14px;">${escapeHtml(notice.customerNote)}</td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b1120;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:#0f1a33;border:1px solid #1e2a44;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 24px;background:#111c38;border-bottom:1px solid #1e2a44;">
        <span style="font-size:18px;font-weight:700;color:#818cf8;">TuniXpay</span>
        <span style="float:right;color:#94a3b8;font-size:13px;">${escapeHtml(KIND_LABELS[notice.kind])}</span>
      </div>
      <div style="padding:24px;color:#e2e8f0;">
        <h2 style="margin:0 0 4px;font-size:20px;color:#818cf8;">${escapeHtml(notice.orderNumber)}</h2>
        <p style="margin:0 0 18px;color:#94a3b8;font-size:13px;">Order form — sent automatically on ${escapeHtml(new Date().toISOString().slice(0, 16).replace("T", " "))} UTC</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;" role="presentation">
          <tr>
            <td style="padding:8px 14px;color:#94a3b8;font-size:13px;width:140px;">Customer</td>
            <td style="padding:8px 14px;font-weight:600;">${escapeHtml(notice.customerName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;color:#94a3b8;font-size:13px;">Email</td>
            <td style="padding:8px 14px;">${escapeHtml(notice.customerEmail)}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;color:#94a3b8;font-size:13px;">Phone</td>
            <td style="padding:8px 14px;">${escapeHtml(notice.customerPhone || "—")}</td>
          </tr>
          ${noteBlock}
          ${paymentRows}
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:18px;background:#0b1120;border-radius:8px;" role="presentation">
          <tr style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">
            <td style="padding:10px 14px;">Item</td>
            <td style="padding:10px 14px;text-align:center;">Qty</td>
            <td style="padding:10px 14px;text-align:right;">Line total</td>
          </tr>
          ${itemRows}
        </table>

        <div style="margin-top:18px;text-align:right;">
          <span style="color:#94a3b8;font-size:14px;margin-right:10px;">TOTAL</span>
          <strong style="font-size:20px;color:#818cf8;">${total}</strong>
        </div>

        <p style="margin:24px 0 0;color:#64748b;font-size:12px;">
          Verify the incoming payment against your D17 / Flouci / WafaCash records before delivering keys.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export interface NotifySendResult {
  email: { attempted: boolean; ok: boolean };
  whatsapp: { attempted: boolean; ok: boolean };
}

const SEND_TIMEOUT_MS = 10_000;

async function sendOrderEmail(notice: OrderNotice): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !to) return false; // not configured — skip silently

  const from = process.env.NOTIFY_EMAIL_FROM ?? to;
  const kind = KIND_LABELS[notice.kind];
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from, name: "TuniXpay Orders" },
      to: [{ email: to }],
      subject: `${kind} — ${notice.orderNumber} — ${formatPrice(notice.totalMinor, notice.currency)}`,
      htmlContent: buildOrderEmailHtml(notice),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  return res.ok;
}

async function sendWhatsappNotice(notice: OrderNotice): Promise<boolean> {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone = process.env.NOTIFY_WHATSAPP_TO;
  if (!apiKey || !phone) return false; // not configured — skip silently

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", buildWhatsappText(notice));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
  return res.ok;
}

/**
 * Fire both channels; never throws. Missing env vars skip silently.
 * Call this inside `after()` so the customer response is never blocked.
 */
export async function dispatchOrderNotice(notice: OrderNotice): Promise<NotifySendResult> {
  const [emailResult, whatsappResult] = await Promise.allSettled([
    sendOrderEmail(notice),
    sendWhatsappNotice(notice),
  ]);

  const summarize = (r: PromiseSettledResult<boolean>) =>
    r.status === "rejected"
      ? { attempted: true, ok: false }
      : { attempted: true, ok: r.value };

  const result: NotifySendResult = {
    email: summarize(emailResult),
    whatsapp: summarize(whatsappResult),
  };

  // Only log genuine transport failures (not configuration skips).
  if (emailResult.status === "rejected") {
    console.warn("[notify] email send failed:", String(emailResult.reason).slice(0, 200));
  }
  if (whatsappResult.status === "rejected") {
    console.warn("[notify] whatsapp send failed:", String(whatsappResult.reason).slice(0, 200));
  }
  return result;
}

// ── Keys delivered to the CUSTOMER's email (guest-first store) ──────────────
// Clients do not sign in: delivered key codes are mailed to the exact email
// used at checkout. Requires BREVO_API_KEY; skips silently when absent.

export interface DeliveredKeyLine {
  title: string;
  label: string;
  quantity: number;
  keys: string[];
}

export function buildKeysEmailHtml(
  orderNumber: string,
  customerName: string,
  lines: DeliveredKeyLine[],
): string {
  const sections = lines
    .map(
      (l) => `
      <div style="margin:0 0 16px;">
        <p style="margin:0 0 6px;font-size:14px;color:#e2e8f0;">
          <strong>${escapeHtml(l.title)}</strong>
          <span style="color:#94a3b8;"> — ${escapeHtml(l.label)} × ${l.quantity}</span>
        </p>
        ${l.keys
          .map(
            (k) => `<div style="margin:0 0 6px;padding:10px 12px;border:1px solid #1e2a44;border-radius:8px;background:#0b1120;font-family:Consolas,monospace;font-size:13px;color:#a5b4fc;">${escapeHtml(k)}</div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b1120;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:#0f1a33;border:1px solid #1e2a44;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 24px;background:#111c38;border-bottom:1px solid #1e2a44;">
        <span style="font-size:18px;font-weight:700;color:#818cf8;">TuniXpay</span>
        <span style="float:right;color:#94a3b8;font-size:13px;">Your keys are ready</span>
      </div>
      <div style="padding:24px;color:#e2e8f0;">
        <h2 style="margin:0 0 4px;font-size:20px;color:#818cf8;">Order ${escapeHtml(orderNumber)}</h2>
        <p style="margin:0 0 18px;color:#94a3b8;font-size:13px;">Thank you, ${escapeHtml(customerName)} — your payment is verified and your key(s) are below.</p>
        ${sections}
        <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
          Keep this email — you can also track the order anytime with your order number + this address on our tracking page.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Email the delivered keys to the customer. Never throws; env-gated
 * (skips silently when BREVO_API_KEY is not configured).
 */
export async function sendKeysToCustomerEmail(args: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  lines: DeliveredKeyLine[];
}): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !args.customerEmail || args.lines.length === 0) return false;

  const from = process.env.NOTIFY_EMAIL_FROM ?? process.env.NOTIFY_EMAIL_TO ?? args.customerEmail;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from, name: "TuniXpay Delivery" },
      to: [{ email: args.customerEmail }],
      replyTo: { email: from },
      subject: `Your key(s) for order ${args.orderNumber} — TuniXpay`,
      htmlContent: buildKeysEmailHtml(args.orderNumber, args.customerName, args.lines),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  return res.ok;
}
