import type { Metadata } from "next";
import { Gamepad2, Package, Zap, ShieldCheck } from "lucide-react";
import { RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
      {/* brand side */}
      <aside className="hidden lg:block">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 45% at 25% 15%, rgba(139,92,246,0.18) 0%, transparent 60%), radial-gradient(40% 40% at 80% 85%, rgba(56,189,248,0.10) 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-muted shadow-glow">
              <ShieldCheck className="h-6 w-6 text-white" />
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold leading-tight">
              One account, all your orders.
            </h2>
            <ul className="mt-8 space-y-4 text-sm text-foreground-muted">
              <li className="flex items-center gap-3">
                <Package className="h-4 w-4 text-primary" />
                Your orders and delivery status in one place
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-emerald-400" />
                Faster checkout with your details saved
              </li>
              <li className="flex items-center gap-3">
                <Gamepad2 className="h-4 w-4 text-sky-400" />
                Choose the receiving email at checkout — your key goes there
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* form side */}
      <main className="mx-auto w-full max-w-sm lg:mx-0">
        <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every order is saved to your account — sign in to check out and track
          deliveries in one place.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
      </main>
    </div>
  );
}
