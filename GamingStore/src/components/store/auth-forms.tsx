"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2, LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import type { ActionState } from "@/app/actions/auth";

const inputBase =
  "w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60";

const SubmitButton = ({ pending, label, icon }: { pending: boolean; label: string; icon: React.ReactNode }) => (
  <button
    type="submit"
    disabled={pending}
    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-primary-hover disabled:opacity-60"
  >
    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {label}
  </button>
);

const ErrorBox = ({ error }: { error?: string }) =>
  error ? (
    <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {error}
    </p>
  ) : null;

// ── Admin login (the only sign-in surface — storefront is guest-only) ────────
export const LoginForm = ({ nextPath, staffFlag }: { nextPath: string | null; staffFlag: boolean }) => {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath ?? ""} />
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputBase} placeholder="you@example.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Password</span>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={inputBase + " pr-10"}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-2.5 text-foreground-dim hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>
      <ErrorBox error={state.error} />
      <SubmitButton pending={pending} label="Sign in" icon={<LogIn className="h-4 w-4" />} />
      <p className="text-center text-sm text-foreground-muted">
        New here?{" "}
        <Link href="/register" className="text-primary hover:underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {staffFlag && (
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[11px] text-foreground-dim">
          <ShieldCheck className="h-3.5 w-3.5" />
          Dashboard access requires an admin/staff role — enforced server-side.
        </p>
      )}
    </form>
  );
};

// ── Register (optional for customers — buying never requires an account) ────
export const RegisterForm = () => {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Full name</span>
        <input name="fullName" required minLength={2} autoComplete="name" className={inputBase} placeholder="Achraf Ben Ali" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputBase} placeholder="you@example.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-foreground-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputBase}
          placeholder="8+ chars, letters & numbers"
        />
        <span className="mt-1 block text-[11px] text-foreground-dim">
          At least 8 characters with a letter and a digit.
        </span>
      </label>
      <ErrorBox error={state.error} />
      {state.success && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {state.success}
        </p>
      )}
      <SubmitButton pending={pending} label="Create account" icon={<LogIn className="h-4 w-4" />} />
      <p className="text-center text-sm text-foreground-muted">
        Already registered?{" "}
        <Link href="/login" className="text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
      <p className="text-center text-[11px] text-foreground-dim">
        An account is optional — you can always buy as a guest and track orders
        with your order number.
      </p>
    </form>
  );
};
