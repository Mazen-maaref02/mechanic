"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, XCircle } from "lucide-react";
import { verifyPaymentAction } from "@/app/actions/admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PaymentVerifyProps {
  paymentId: string;
  /** Only show controls for payments in a verifiable state. */
  status: string;
  compact?: boolean;
}

/**
 * Admin controls for a manually-verified payment. Verification is ALWAYS a
 * human decision made against the admin's own RedotPay/Binance/D17 dashboard —
 * there is no auto-approve path in this component or anywhere else.
 */
export const PaymentVerify = ({ paymentId, status, compact = false }: PaymentVerifyProps) => {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const verifiable = status === "submitted" || status === "pending";
  if (!verifiable && !message) return null;

  const run = async (approve: boolean, rejectReason?: string) => {
    setBusy(approve ? "approve" : "reject");
    setMessage(null);
    const res = await verifyPaymentAction(paymentId, approve, rejectReason ?? null);
    setBusy(null);
    setMessage(res.ok ? { kind: "ok", text: res.info ?? "Done." } : { kind: "err", text: res.error ?? "Failed." });
    if (res.ok) router.refresh();
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={cn(
            "w-full rounded-lg px-3 py-2 text-sm",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
          )}
        >
          {message.kind === "ok" ? <CircleCheck className="mr-2 inline h-4 w-4" /> : null}
          {message.text}
        </p>
      )}

      {verifiable && (
        <>
          <button
            onClick={() => run(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
            Verify payment
          </button>
          <button
            onClick={() => setRejectOpen(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/5 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </>
      )}

      {/* Reject requires a short reason — recorded on the payment + audit log. */}
      <Dialog open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payment</DialogTitle>
            <DialogDescription>
              The customer will be asked to submit a new reference. Check that the transfer truly is not on your
              dashboard before rejecting.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. No matching transfer found for the reference provided"
            className="min-h-[90px] w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await run(false, reason.trim() || "No matching transfer found");
                setRejectOpen(false);
              }}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject payment
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
