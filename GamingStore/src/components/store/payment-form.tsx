"use client";

import * as React from "react";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, ShieldCheck, CircleCheck, Info } from "lucide-react";
import { submitPaymentAction, type PaymentMethodConfig, type SubmitPaymentResult } from "@/app/actions/checkout";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { cn } from "@/lib/utils";

interface PaymentFormProps {
  orderId: string;
  /** Guest checkout: the exact email used at checkout verifies order access. */
  guestEmail: string;
  orderNumber: string;
  totalLabel: string;
  currency: string;
  methods: Record<string, PaymentMethodConfig>;
  preferred?: string | null;
  alreadySubmitted: boolean;
}

type MethodKey = "d17_edinar" | "flouci" | "cash" | "wafacash";

export const PaymentForm = ({
  orderId,
  guestEmail,
  totalLabel,
  methods,
  preferred,
  alreadySubmitted,
}: PaymentFormProps) => {
  const available = (Object.entries(methods) as [MethodKey, PaymentMethodConfig][])
    .filter(([, cfg]) => cfg.enabled);

  const [selected, setSelected] = React.useState<MethodKey | null>(
    (preferred as MethodKey | null) ?? available[0]?.[0] ?? null,
  );
  const [state, formAction, pending] = useActionState<SubmitPaymentResult | null, FormData>(
    submitPaymentAction,
    null,
  );

  if (available.length === 0) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-5 py-4 text-sm text-amber-200">
        <Info className="mr-2 inline h-4 w-4" />
        No payment methods are enabled right now. Please contact support.
      </div>
    );
  }

  const cfg = selected ? methods[selected] : null;

  return (
    <form action={formAction} className="space-y-5">
      {/* method selector */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Payment method">
        {available.map(([key, method]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected === key}
            onClick={() => setSelected(key)}
            className={
              "rounded-xl border p-4 text-left transition-all " +
              (selected === key
                ? "border-primary bg-primary/10"
                : "border-border bg-surface hover:border-primary/40")
            }
          >
            <p className="text-sm font-semibold">{paymentMethodLabel(key)}</p>
            <p className="mt-0.5 text-[11px] text-foreground-muted">{method.display_name}</p>
          </button>
        ))}
      </div>

      {/* instructions */}
      {cfg && (
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <h3 className="font-display text-sm font-semibold text-primary">
            {paymentMethodLabel(selected!)} — how to pay
          </h3>
          <div className="mt-3 space-y-2 text-sm text-foreground-muted">
            <div className="rounded-lg bg-background-raised px-3 py-2 font-mono text-sm text-foreground">
              {cfg.receiver}
            </div>
            <p className="leading-relaxed">{cfg.instructions}</p>
            <p className="text-xs text-foreground-dim">
              Transfer the exact amount: {totalLabel}. Then register the transaction reference below.
            </p>
          </div>
        </motion.div>
      )}

      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="email" value={guestEmail} />
      <input type="hidden" name="method" value={selected ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Transaction reference *</span>
          <input
            name="reference"
            required
            minLength={4}
            maxLength={80}
            placeholder="e.g. TRX-9X2K1A"
            className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-[11px] text-foreground-dim">
            The reference shown in your D17 / Flouci / WafaCash app after paying — for cash, use the receipt number.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Payment proof (optional)</span>
          <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background-raised px-3 text-sm text-foreground-muted hover:border-primary/50">
            <FileUp className="h-4 w-4" />
            Upload JPG / PNG / WEBP / PDF (max 5MB)
            <input
              type="file"
              name="proof"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
            />
          </label>
          <span className="mt-1 block text-[11px] text-foreground-dim">
            Only stored in a private bucket — visible to you and our verification team.
          </span>
        </label>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CircleCheck className="h-4 w-4" />
          Payment reference registered — our team verifies it against the transfer. Refresh this page to see the status.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !selected}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {alreadySubmitted ? "Update payment submission" : "Submit payment reference"}
      </button>
      <p className={cn("text-center text-[11px] text-foreground-dim")}>
        Verification is manual. Screenshots alone never confirm a payment — our team checks
        the transfer on our own dashboard using your reference.
      </p>
    </form>
  );
};
