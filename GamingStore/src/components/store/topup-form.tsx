"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { requestTopupAction, type TopupResult } from "@/app/actions/topup";
import { topupRequestSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

const inputBase =
  "w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60";

const SERVICES = [
  { id: "redotpay", label: "RedotPay charge", refLabel: "RedotPay account ID (e.g. RP-1234-5678)", fee: "4%" },
  { id: "binance", label: "Binance USDT charge", refLabel: "Binance Pay ID or UID", fee: "5%" },
  { id: "rizon", label: "Rizon charge", refLabel: "Rizon account ID", fee: "3%" },
  { id: "other", label: "Other service", refLabel: "Account identifier or username", fee: "6%" },
] as const;

type TopupFormValues = z.infer<typeof topupRequestSchema>;

export const TopupRequestForm = ({ defaultCurrency }: { defaultCurrency: "TND" | "USD" }) => {
  const [state, formAction, pending] = useActionState<TopupResult, FormData>(requestTopupAction, {});
  const [service, setService] = React.useState<string>("redotpay");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TopupFormValues>({
    resolver: zodResolver(topupRequestSchema),
    defaultValues: { currency: defaultCurrency, service: "redotpay" },
  });

  const serviceMeta = SERVICES.find((s) => s.id === service) ?? SERVICES[0];

  // Client-side zod validation first, then dispatch the server action
  // (which re-validates the same schema — never trust the client).
  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) fd.set(key, String(value));
    }
    formAction(fd);
  });

  if (state.requestNumber) {
    return (
      <div className="space-y-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> {state.success}
        </p>
        <p className="text-sm text-foreground-muted">
          Save your request number — our team processes the request during business
          hours and confirms by email.
        </p>
        <Link
          href="/shop"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Back to the shop <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Your name</span>
        <input {...register("customerName")} className={inputBase} placeholder="Achraf Ben Ali" />
        {errors.customerName && <span className="mt-1 block text-xs text-red-300">{errors.customerName.message}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Email</span>
          <input {...register("customerEmail")} type="email" autoComplete="email" className={inputBase} placeholder="you@example.com" />
          {errors.customerEmail && <span className="mt-1 block text-xs text-red-300">{errors.customerEmail.message}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Phone / WhatsApp</span>
          <input {...register("customerPhone")} type="tel" autoComplete="tel" className={inputBase} placeholder="+216 …" />
          {errors.customerPhone && <span className="mt-1 block text-xs text-red-300">{errors.customerPhone.message}</span>}
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Service</span>
        <select
          {...register("service", { onChange: (e) => setService(e.target.value) })}
          className={inputBase}
        >
          {SERVICES.map((s) => (
            <option key={s.id} value={s.id}>{s.label} (fee {s.fee})</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">{serviceMeta.refLabel}</span>
        <input {...register("recipientRef")} className={inputBase} placeholder="Account identifier" />
        {errors.recipientRef && <span className="mt-1 block text-xs text-red-300">{errors.recipientRef.message}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Amount ({defaultCurrency})</span>
          <input {...register("amount", { valueAsNumber: true })} type="number" min={1} step={1} className={inputBase} placeholder="500" />
          {errors.amount && <span className="mt-1 block text-xs text-red-300">{errors.amount.message}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">You will pay with</span>
          <select {...register("paymentMethod")} className={inputBase}>
            <option value="d17_edinar">D17 / e-Dinar</option>
            <option value="flouci">Flouci</option>
            <option value="wafacash">WafaCash</option>
            <option value="cash">Cash</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">
          Transaction reference <span className="text-foreground-dim">(optional — if you already paid)</span>
        </span>
        <input {...register("reference")} className={inputBase} placeholder="e.g. TRX-88990021" />
        {errors.reference && <span className="mt-1 block text-xs text-red-300">{errors.reference.message}</span>}
      </label>
      <input type="hidden" {...register("currency")} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit request
      </button>

      <p className="flex items-start gap-2 rounded-lg bg-surface px-3 py-2.5 text-[11px] leading-relaxed text-foreground-dim">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        We only ask for an account identifier. We will NEVER ask for a wallet password,
        seed phrase or private key — anyone who does is impersonating us.
      </p>
    </form>
  );
};
