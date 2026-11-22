"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { savePaymentInstructionsAction, setExchangeRateAction } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/admin";
import type { PaymentMethodConfig } from "@/app/actions/checkout";
import { PAYMENT_METHOD_KEYS, paymentMethodLabel } from "@/lib/payment-methods";
import { cn } from "@/lib/utils";

type AnyResult = ActionResult;

const METHOD_ORDER = PAYMENT_METHOD_KEYS;

interface RateSnapshot {
  base: string;
  quote: string;
  rate: number;
  createdAt: string;
}

/**
 * Two independent forms:
 *  - Payment instructions per method (receiver + instructions text).
 *  - USD→TND exchange rate (integer-rate ×10000 snapshot used at checkout).
 */
export const SettingsForms = ({
  methods,
  methodsUpdatedAt,
  limits,
  latestRate,
}: {
  methods: Record<string, PaymentMethodConfig>;
  methodsUpdatedAt: string | null;
  limits: unknown;
  latestRate: RateSnapshot | null;
}) => {
  const router = useRouter();

  // ── payment instructions ──────────────────────────────────────────
  const [rows, setRows] = React.useState(() =>
    METHOD_ORDER.filter((k) => methods[k]).map((k) => ({
      key: k,
      enabled: methods[k]!.enabled,
      displayName: methods[k]!.display_name,
      receiver: methods[k]!.receiver,
      instructions: methods[k]!.instructions,
    })),
  );
  const [savingMethods, setSavingMethods] = React.useState(false);
  const [methodsMsg, setMethodsMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const saveMethods = async () => {
    setSavingMethods(true);
    setMethodsMsg(null);
    const payload: Record<string, PaymentMethodConfig> = {};
    for (const r of rows) {
      payload[r.key] = {
        enabled: r.enabled,
        display_name: r.displayName,
        receiver: r.receiver,
        instructions: r.instructions,
      };
    }
    const res: AnyResult = await savePaymentInstructionsAction(payload);
    setSavingMethods(false);
    setMethodsMsg(
      res.ok
        ? { ok: true, text: res.info ?? "Payment instructions saved." }
        : { ok: false, text: res.error ?? "Save failed." },
    );
    if (res.ok) router.refresh();
  };

  // ── exchange rate ─────────────────────────────────────────────────
  const [rateInput, setRateInput] = React.useState(() =>
    latestRate ? String(latestRate.rate) : "",
  );
  const [savingRate, setSavingRate] = React.useState(false);
  const [rateMsg, setRateMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const saveRate = async () => {
    setSavingRate(true);
    setRateMsg(null);
    const parsed = Number(rateInput);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100000) {
      setSavingRate(false);
      setRateMsg({ ok: false, text: "Enter a positive rate, e.g. 3.1280." });
      return;
    }
    const res: AnyResult = await setExchangeRateAction(parsed);
    setSavingRate(false);
    setRateMsg(
      res.ok
        ? { ok: true, text: res.info ?? "Exchange rate published." }
        : { ok: false, text: res.error ?? "Failed." },
    );
    if (res.ok) router.refresh();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface" aria-label="Payment methods">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-display text-sm font-semibold">Payment methods</h2>
          {methodsUpdatedAt && (
            <p className="text-[11px] text-foreground-dim">
              last saved {new Date(methodsUpdatedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
        <div className="space-y-4 px-5 py-4">
          {rows.map((row, idx) => (
            <div key={row.key} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{paymentMethodLabel(row.key)}</p>
                <label className="flex items-center gap-2 text-xs text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, enabled: e.target.checked } : x)))
                    }
                    className="h-4 w-4 accent-current"
                  />
                  enabled
                </label>
              </div>
              <label className="mb-2 block text-xs">
                <span className="block text-foreground-dim">Receiver shown to customers</span>
                <input
                  value={row.receiver}
                  onChange={(e) => setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, receiver: e.target.value } : x)))}
                  maxLength={120}
                  className="mt-1 w-full rounded-md border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs">
                <span className="block text-foreground-dim">Instructions</span>
                <textarea
                  value={row.instructions}
                  onChange={(e) =>
                    setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, instructions: e.target.value } : x)))
                  }
                  maxLength={400}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          ))}

          {methodsMsg && (
            <p
              role={methodsMsg.ok ? "status" : "alert"}
              className={cn(
                "flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm",
                methodsMsg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
              )}
            >
              {methodsMsg.ok ? <CircleCheck className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
              {methodsMsg.text}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveMethods}
              disabled={savingMethods || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {savingMethods && <Loader2 className="h-4 w-4 animate-spin" />} Save payment instructions
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-5" aria-label="Currencies">
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-display text-sm font-semibold">Exchange rate USD→TND</h2>
            <p className="text-[11px] text-foreground-dim">
              Admin-controlled, no live source. Orders snapshot it at purchase time — later edits never touch past
              orders.
            </p>
          </div>
          <div className="space-y-3 px-5 py-4">
            {latestRate && (
              <p className="text-sm text-foreground-muted">
                Current: <span className="font-mono font-semibold text-foreground">{latestRate.rate} TND/USD</span>{" "}
                ({new Date(latestRate.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })})
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-foreground-muted">New rate (e.g. 3.1280)</span>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                max="100000"
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  setRateMsg(null);
                }}
                className="w-44 rounded-lg border border-border bg-background-raised px-3 py-2 font-mono tabular-nums text-sm outline-none focus:border-primary"
              />
            </label>
            {rateMsg && (
              <p
                role={rateMsg.ok ? "status" : "alert"}
                className={cn(
                  "flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  rateMsg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
                )}
              >
                {rateMsg.ok ? <CircleCheck className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                {rateMsg.text}
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={saveRate}
                disabled={savingRate || rateInput.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {savingRate && <Loader2 className="h-4 w-4 animate-spin" />} Publish rate
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-display text-sm font-semibold">Service fee limits</h2>
            <p className="text-[11px] text-foreground-dim">Read-only preview — edit via SQL for now.</p>
          </div>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-xs text-foreground-muted">
            {JSON.stringify(limits, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
};
