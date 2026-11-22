import type { Metadata } from "next";
import Link from "next/link";
import { CategoryView } from "@/components/store/category-view";
import { Wallet, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Top-up services",
};

export default async function TopUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <>
      {/* service request CTA — links to the dedicated service request flow */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-accent/20 bg-gradient-to-r from-sky-400/5 via-surface to-surface p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="font-display text-base font-semibold">Need a balance top-up?</h2>
              <p className="mt-0.5 text-sm text-foreground-muted">
                RedotPay, Binance USDT and Rizon charging requests are handled through a dedicated form.
                We only ever ask for your account ID — never passwords or keys. No account needed.
              </p>
            </div>
          </div>
          <Link
            href="/top-up/request"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent-muted px-5 text-sm font-semibold text-[#04222e] transition-colors hover:bg-accent"
          >
            Request a top-up <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <CategoryView
        slug="top-up"
        title="Top-up services"
        description="Charging services with clear pricing and processing windows."
        basePath="/top-up"
        searchParams={params}
      />
    </>
  );
}
