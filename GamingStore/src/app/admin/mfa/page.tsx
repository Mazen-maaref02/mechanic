import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { MfaManager } from "@/components/admin/mfa-manager";

export const metadata: Metadata = { title: "MFA" };

export default async function AdminMfaPage() {
  const user = await requireAdmin("/admin/mfa");
  const supabase = await createClient();

  // server-side factor listing (session cookie attached to this client)
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factors = (factorsData?.totp ?? []).map((f) => ({
    id: f.id,
    verified: f.status === "verified",
    createdAt: f.created_at,
    friendlyName: f.friendly_name ?? null,
  }));

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Two-factor (TOTP)</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Admin accounts hold payment verification and key-delivery powers — enroll at least one authenticator per
          device. Recovery codes are single-use; store them safely.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Account status
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-foreground-muted">MFA enforced for your role</dt>
              <dd>{user.profile.mfa_enforced ? "Yes" : "Optional (recommended)"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-foreground-muted">Verified factors</dt>
              <dd className="tabular-nums">{factors.filter((f) => f.verified).length}</dd>
            </div>
          </dl>
          {factorsError && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Could not read factors: {factorsError.message}
            </p>
          )}
        </section>

        <MfaManager
          factors={factors}
          enforced={user.profile.mfa_enforced}
        />
      </div>
    </div>
  );
}
