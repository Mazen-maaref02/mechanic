import type { Metadata } from "next";
import { Gamepad2, KeyRound, Zap, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/store/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextRaw = params.next;
  const next = (Array.isArray(nextRaw) ? nextRaw[0] : nextRaw) ?? null;
  const staffFlag = params.staff === "1";

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
              Team access &amp; order history.
            </h2>
            <ul className="mt-8 space-y-4 text-sm text-foreground-muted">
              <li className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-primary" />
                Encrypted key inventory, managed end to end
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-emerald-400" />
                Manual payment verification &amp; delivery control
              </li>
              <li className="flex items-center gap-3">
                <Gamepad2 className="h-4 w-4 text-sky-400" />
                Customers can also sign in for their order history
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* form side */}
      <main className="mx-auto w-full max-w-sm lg:mx-0">
        <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Welcome back. Sign in to check out — every order is saved to your
          account, with keys sent to the receiving email you choose.
        </p>
        <div className="mt-6">
          <LoginForm nextPath={next} staffFlag={staffFlag} />
        </div>
      </main>
    </div>
  );
}
