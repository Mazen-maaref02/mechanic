import type { Metadata } from "next";
import { TopupRequestForm } from "@/components/store/topup-form";

export const metadata: Metadata = {
  title: "Request a top-up",
};

export default function TopupRequestPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Request a top-up</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Submit a RedotPay, Binance or Rizon charge request — no account needed.
        Our team processes it in business hours and confirms by email.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <TopupRequestForm defaultCurrency="TND" />
      </div>
      <p className="mt-4 text-xs text-foreground-dim">
        Processing times: typically under 1 hour during opening hours (9:00–21:00 GMT+1).
        A fee applies per service and is shown on your request.
      </p>
    </div>
  );
}
