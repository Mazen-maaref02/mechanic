"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, CircleX, CircleCheck } from "lucide-react";
import { setOrderStatusAction } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  wafacash: "WafaCash",
  cash: "Cash",
  other: "Other",
};

const METHODS: { value: string; label: string }[] = [
  { value: "d17_edinar", label: "D17 / e-Dinar" },
  { value: "flouci", label: "Flouci" },
  { value: "wafacash", label: "WafaCash" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

/**
 * Off-site payment confirmation — the store never collects payments online.
 * The client picked his method at checkout; the team confirms with him
 * directly and records the payment here with ONE click — the method is
 * taken from the order automatically. Fulfillment happens in the
 * Fulfillment section.
 */
export const OrderStatusControls = ({
  orderId,
  status,
  currentMethod,
}: {
  orderId: string;
  status: string;
  currentMethod?: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  // Fallback only for legacy orders placed before client-side method choice.
  const [method, setMethod] = React.useState<string>(currentMethod ?? "d17_edinar");
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const run = async (key: string, nextStatus: string, withMethod?: string | null) => {
    setBusy(key);
    setMessage(null);
    const res = await setOrderStatusAction(orderId, nextStatus, null, withMethod ?? undefined);
    setBusy(null);
    setMessage(res.ok ? { kind: "ok", text: res.info ?? "Done." } : { kind: "err", text: res.error ?? "Failed." });
    if (res.ok) router.refresh();
  };

  const canConfirm = status === "pending_payment" || status === "payment_submitted";
  const canCancel = status !== "cancelled" && status !== "completed" && status !== "refunded";

  if (!canConfirm && !canCancel) return null;

  return (
    <div>
      {canConfirm && (
        <div>
          {currentMethod && (
            <p className="mb-2 text-xs text-foreground-muted">
              Client chose to pay with{" "}
              <span className="font-semibold text-foreground">
                {METHOD_LABELS[currentMethod] ?? currentMethod}
              </span>
            </p>
          )}
          <div className={cn("flex gap-2", !currentMethod && "flex-col sm:flex-row")}>
            {!currentMethod && (
              <label className="block sm:w-44 sm:shrink-0">
                <span className="mb-1 block text-xs font-medium text-foreground-muted">How he paid</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              onClick={() => run("paid", "payment_verified", currentMethod ?? method)}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "paid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Payment received
            </button>
          </div>
        </div>
      )}
      {canCancel && (
        <button
          onClick={() => run("cancel", "cancelled")}
          disabled={busy !== null}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground-muted hover:bg-surface-hover disabled:opacity-60",
            canConfirm && "mt-2",
          )}
        >
          {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleX className="h-4 w-4" />}
          Cancel order
        </button>
      )}
      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-xs",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
          )}
        >
          {message.kind === "ok" ? <CircleCheck className="mr-1.5 inline h-3.5 w-3.5" /> : null}
          {message.text}
        </p>
      )}
    </div>
  );
};
