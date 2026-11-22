"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Send, PackageCheck, CircleCheck } from "lucide-react";
import { manualDeliverAction, retryAutomaticDeliveryAction } from "@/app/actions/admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface OrderActionsProps {
  orderId: string;
  needsRetry: boolean;
  pendingItems: { id: string; label: string }[];
  allDelivered: boolean;
}

export const OrderActions = ({ orderId, needsRetry, pendingItems, allDelivered }: OrderActionsProps) => {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [manualItem, setManualItem] = React.useState<string | null>(null);
  const [manualContent, setManualContent] = React.useState("");

  const run = async (key: string, fn: () => Promise<{ ok: boolean; info?: string; error?: string }>) => {
    setBusy(key);
    setMessage(null);
    const res = await fn();
    setBusy(null);
    setMessage(res.ok ? { kind: "ok", text: res.info ?? "Done." } : { kind: "err", text: res.error ?? "Failed." });
    if (res.ok) router.refresh();
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-sm font-semibold">Fulfillment</h2>

      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-sm",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
          )}
        >
          {message.kind === "ok" ? <CircleCheck className="mr-2 inline h-4 w-4" /> : null}
          {message.text}
        </p>
      )}

      {needsRetry && (
        <button
          onClick={() => run("retry", () => retryAutomaticDeliveryAction(orderId))}
          disabled={busy !== null}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-400/20 disabled:opacity-60"
        >
          {busy === "retry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Retry automatic delivery (check inventory first)
        </button>
      )}

      {pendingItems.length > 0 && !allDelivered && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">
            Manual delivery — pending items
          </p>
          {pendingItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setManualItem(item.id); setManualContent(""); }}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-left text-sm hover:border-primary/40"
            >
              <span className="truncate">{item.label}</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <PackageCheck className="h-3.5 w-3.5" /> Fulfill
              </span>
            </button>
          ))}
        </div>
      )}

      {allDelivered && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CircleCheck className="h-3.5 w-3.5" /> All items delivered — order completed.
        </p>
      )}

      {/* manual delivery dialog */}
      <Dialog open={Boolean(manualItem)} onOpenChange={(o) => !o && setManualItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual fulfillment</DialogTitle>
            <DialogDescription>
              Enter the delivery details the customer will see (code, card number masking, notes).
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            placeholder="e.g. Code sent via RedotPay to your account, ref: XXXX"
            className="min-h-[110px] w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setManualItem(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover">
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!manualItem) return;
                await run("manual", () => manualDeliverAction(manualItem, manualContent));
                setManualItem(null);
              }}
              disabled={manualContent.trim().length < 2 || busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Deliver & notify
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
