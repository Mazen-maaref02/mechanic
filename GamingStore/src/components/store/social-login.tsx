"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SocialProvider = "google" | "apple";

const PROVIDERS: { id: SocialProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M17.05 12.54c-.04-2.2 1.8-3.26 1.88-3.31a4.13 4.13 0 0 0-3.26-1.76c-1.37-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.93-.77a4.33 4.33 0 0 0-3.64 2.22c-1.56 2.7-.4 6.7 1.1 8.89.74 1.07 1.6 2.27 2.75 2.23 1.11-.05 1.53-.72 2.87-.72 1.34 0 1.72.72 2.9.69 1.2-.02 1.95-1.08 2.68-2.16a8.9 8.9 0 0 0 1.22-2.5c-2.81-1.08-2.84-3.63-2.18-4.62ZM14.8 5.9A4.08 4.08 0 0 0 15.79 3a4.16 4.16 0 0 0-2.7 1.4 3.87 3.87 0 0 0-.97 2.8c1.01.08 2.04-.51 2.68-1.3Z" />
      </svg>
    ),
  },
];

/**
 * Quick sign-in with Gmail / Apple via Supabase OAuth. The browser is sent to
 * the provider and returns to /auth/callback, which exchanges the code for a
 * session and redirects by role (admin → /admin, customer → /account).
 */
export const SocialLoginButtons = ({ compact = false }: { compact?: boolean }) => {
  const [busy, setBusy] = React.useState<SocialProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const start = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (oauthError) {
      const msg = oauthError.message.toLowerCase();
      setError(
        msg.includes("not enabled") || msg.includes("unsupported provider")
          ? "This sign-in option is not enabled yet — please use email and password."
          : "Could not start sign-in. Please try again.",
      );
      setBusy(null);
    }
    // On success the browser navigates to the provider — no state reset needed.
  };

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void start(p.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-surface-hover disabled:opacity-60"
          >
            {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : p.icon}
            {compact ? p.label.replace("Continue ", "") : p.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
};

/** Divider used between the password form and the quick sign-in buttons. */
export const SocialDivider = () => (
  <div className="relative my-5">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-background px-2 text-[11px] uppercase tracking-wide text-foreground-dim">
        or quick sign in
      </span>
    </div>
  </div>
);
