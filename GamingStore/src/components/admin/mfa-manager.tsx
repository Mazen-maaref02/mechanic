"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Factor {
  id: string;
  verified: boolean;
  createdAt: string;
  friendlyName: string | null;
}

async function getSupabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

type EnrollStep = { factorId: string; provisioningUri: string; secret: string | null };

/**
 * TOTP factor management via GoTrue from the browser: enroll → add secret to
 * an authenticator app → verify(challenge code) → factor becomes active.
 * The enrollment secret is only exchanged with GoTrue, never persisted here.
 */
export const MfaManager = ({ factors, enforced }: { factors: Factor[]; enforced: boolean }) => {
  const router = useRouter();
  const [enroll, setEnroll] = React.useState<EnrollStep | null>(null);
  const [challenge, setChallenge] = React.useState<{ factorId: string; challengeId: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [verifyCode, setVerifyCode] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [removing, setRemoving] = React.useState<Factor | null>(null);

  const startEnroll = async () => {
    setBusy("enroll");
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `admin-${new Date().toISOString().slice(0, 10)}`,
      });
      if (error || !data) throw new Error(error?.message ?? "Enroll failed.");
      // GoTrue returns { id, totp: { qr_code | uri, secret } } — the URI is the otpauth:// provisioning URI
      const uri = data.totp?.uri ?? data.totp?.qr_code ?? "";
      if (!uri) throw new Error("No provisioning URI returned by the server.");
      setEnroll({ factorId: data.id, provisioningUri: uri, secret: data.totp?.secret ?? null });
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Enroll failed." });
    }
    setBusy(null);
  };

  const confirmEnroll = async () => {
    if (!enroll) return;
    setBusy("verify");
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enroll.factorId,
        code: code.replace(/\s/g, ""),
      });
      if (error) throw new Error(error.message);
      setEnroll(null);
      setCode("");
      setMessage({ kind: "ok", text: "Authenticator verified — it is now active for sign-in." });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Verification failed. Try the next code." });
    }
    setBusy(null);
  };

  const unenroll = async () => {
    if (!removing) return;
    if (enforced && factors.filter((f) => f.verified).length === 1) {
      setMessage({ kind: "err", text: "MFA is enforced for admins — enroll a replacement factor before removing this one." });
      return;
    }
    setBusy("unenroll");
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: removing.id });
      if (error) throw new Error(error.message);
      setMessage({ kind: "ok", text: "Factor removed." });
      setRemoving(null);
      router.refresh();
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Removal failed." });
    }
    setBusy(null);
  };

  /** For already-verified factors a quick challenge confirms the device works. */
  const testFactor = async (factorId: string) => {
    setBusy(factorId);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error || !data) throw new Error(error?.message ?? "Challenge failed.");
      setChallenge({ factorId, challengeId: data.id });
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Challenge failed." });
    }
    setBusy(null);
  };

  const assertChallenge = async () => {
    if (!challenge || verifyCode.trim().length === 0) return;
    setBusy("assert");
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.mfa.verify({
        factorId: challenge.factorId,
        challengeId: challenge.challengeId,
        code: verifyCode.replace(/\s/g, ""),
      });
      if (error) throw new Error(error.message);
      setMessage({ kind: "ok", text: "Code accepted — this device is working." });
      setChallenge(null);
      setVerifyCode("");
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Wrong code — try the next one." });
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={cn(
            "flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
          )}
        >
          {message.kind === "ok" ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {message.text}
        </p>
      )}

      {/* existing factors */}
      <section className="rounded-xl border border-border bg-surface" aria-label="Enrolled factors">
        <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Enrolled authenticators</h2>
        <ul className="divide-y divide-border">
          {factors.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <div>
                <p className="font-medium">{f.friendlyName ?? f.id.slice(0, 8)}</p>
                <p className="text-xs text-foreground-muted">
                  {f.verified ? "verified" : "unverified"} · {new Date(f.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {f.verified && (
                  <button
                    onClick={() => testFactor(f.id)}
                    disabled={busy !== null}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-60"
                  >
                    {busy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
                  </button>
                )}
                <button
                  onClick={() => setRemoving(f)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </li>
          ))}
          {factors.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-foreground-muted">
              No authenticators yet — enroll one below.
            </li>
          )}
        </ul>
      </section>

      {/* test challenge for verified factor */}
      {challenge && (
        <section className="rounded-xl border border-sky-500/30 bg-surface px-5 py-4">
          <p className="text-sm font-semibold">Confirm the 6-digit code on your authenticator</p>
          <div className="mt-2 flex gap-2">
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-28 rounded-lg border border-border bg-background-raised px-3 py-2 text-center font-mono outline-none focus:border-primary"
            />
            <button
              onClick={assertChallenge}
              disabled={busy !== null || verifyCode.length !== 6}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "assert" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Confirm
            </button>
            <button
              onClick={() => {
                setChallenge(null);
                setVerifyCode("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* enroll flow */}
      {!enroll && factors.filter((f) => f.verified).length < 5 && (
        <section className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-sm font-semibold">Add an authenticator</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Works with any TOTP app (Authy, Google Authenticator, 1Password…). Enroll once per device.
          </p>
          <button
            onClick={startEnroll}
            disabled={busy !== null}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {busy === "enroll" && <Loader2 className="h-4 w-4 animate-spin" />} Start enrollment
          </button>
        </section>
      )}

      {enroll && (
        <section className="rounded-xl border border-primary/40 bg-surface px-5 py-4" aria-label="Add authenticator">
          <p className="text-sm font-semibold">1. Add the key to your authenticator app</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Most apps accept a &ldquo;manual entry&rdquo; / plus-button. Paste the secret below (or scan the
            provisioning link in an app that supports it).
          </p>
          {enroll.secret ? (
            <code className="mt-2 block break-all rounded-lg bg-surface-raised px-3 py-2 font-mono text-sm">
              {enroll.secret}
            </code>
          ) : (
            <code className="mt-2 block break-all rounded-lg bg-surface-raised px-3 py-2 font-mono text-xs">
              {enroll.provisioningUri}
            </code>
          )}
          <p className="mt-4 text-sm font-semibold">2. Enter the 6-digit code it shows</p>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-28 rounded-lg border border-border bg-background-raised px-3 py-2 text-center font-mono outline-none focus:border-primary"
            />
            <button
              onClick={confirmEnroll}
              disabled={busy !== null || code.length !== 6}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "verify" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Verify &amp; activate
            </button>
            <button
              onClick={async () => {
                const supabase = await getSupabase();
                await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => undefined);
                setEnroll(null);
                setCode("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-[11px] text-foreground-dim">
            Codes rotate every 30 seconds — if yours fails, wait for the next one.
          </p>
        </section>
      )}

      {removing && (
        <div className="rounded-xl border border-red-400/40 bg-surface px-5 py-4">
          <p className="text-sm font-semibold text-red-300">Remove this authenticator?</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Sign-ins with this factor stop working immediately. MFA-protected admin access could lock you out — make
            sure another factor remains.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={unenroll}
              disabled={busy !== null}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {busy === "unenroll" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Remove factor
            </button>
            <button
              onClick={() => setRemoving(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
