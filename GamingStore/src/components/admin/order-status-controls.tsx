"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, CircleX, CircleCheck, Undo2 } from "lucide-react";
import {
  confirmPaymentAndCompleteAction,
  revertPaymentAction,
  setOrderStatusAction,
} from "@/app/actions/admin";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
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
 * The client picked his method at checkout; ONE click records the payment,
 * marks every item delivered and completes the order. A confirmed Revert
 * button undoes a mistaken click.
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
  const [method, setMethod] = React.useState<string>(currentMethod ?? "d17_edinar");
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmRevert, setConfirmRevert] = React.useState(false);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; info?: string; error?: string }>) => {
    setBusy(key);
    setMessage(null);
    const res = await fn();
    setBusy(null);
    setMessage(res.ok ? { kind: "ok", text: res.info ?? "Done." } : { kind: "err", text: res.error ?? "Failed." });
    if (res.ok) router.refresh();
  };

  const canConfirm = status === "pending_payment" || status === "payment_submitted";
  const canRevert = status === "payment_verified" || status === "processing" || status === "completed";

  if (!canConfirm && !canRevert) return null;

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
              onClick={() =>
                run("paid", () => confirmPaymentAndCompleteAction(orderId, currentMethod ?? method))
              }
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "paid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Payment received
            </button>
          </div>
          <p className="mt-2 text-[11px] text-foreground-dim">
            Records the payment and completes the order immediately — stored keys are sent
            automatically, other items are marked delivered for you to send directly.
          </p>
          <button
            onClick={() => run("cancel", () => setOrderStatusAction(orderId, "cancelled"))}
            disabled={busy !== null}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground-muted hover:bg-surface-hover disabled:opacity-60"
          >
            {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleX className="h-4 w-4" />}
            Cancel order
          </button>
        </div>
      )}

      {canRevert && (
        <button
          onClick={() => setConfirmRevert(true)}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-400/20 disabled:opacity-60"
        >
          <Undo2 className="h-4 w-4" />
          Revert payment received
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

      <Dialog open={confirmRevert} onOpenChange={setConfirmRevert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert payment received?</DialogTitle>
            <DialogDescription>
              The order will go back to “pending payment”, the delivery log will be cleared
              and any keys automatically assigned will return to stock. Only do this if you
              clicked by mistake.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmRevert(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Keep as is
            </button>
            <button
              onClick={async () => {
                setConfirmRevert(false);
                await run("revert", () => revertPaymentAction(orderId));
              }}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
            >
              <Undo2 className="h-4 w-4" /> Yes, revert
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
