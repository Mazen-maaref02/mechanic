"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setUserRoleAction } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/admin";

type Role = "customer" | "staff" | "admin";

const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  staff: "Staff",
  admin: "Admin",
};

/**
 * Promote/demote a member. Changing to admin requires an explicit 2-step
 * confirmation because admins can verify payments and decrypt key material.
 */
export const RoleSelect = ({
  userId,
  email,
  current,
}: {
  userId: string;
  email: string;
  current: Role;
}) => {
  const router = useRouter();
  const [role, setRole] = React.useState<Role>(current);
  const [confirmAdmin, setConfirmAdmin] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const changed = role !== current;

  const apply = async () => {
    setBusy(true);
    setMessage(null);
    const res: ActionResult = await setUserRoleAction(userId, role);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error ?? "Failed.");
      setRole(current);
      return;
    }
    setConfirmAdmin(false);
    setMessage(res.info ?? "Updated.");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role);
            setMessage(null);
          }}
          aria-label={`Role for ${email}`}
          disabled={busy}
          className="rounded-lg border border-border bg-background-raised px-2.5 py-1.5 text-xs outline-none focus:border-primary"
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        {changed && (
          <>
            {role === "admin" && !confirmAdmin ? (
              <button
                onClick={() => setConfirmAdmin(true)}
                className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Verify: grant admin?
              </button>
            ) : (
              <button
                onClick={apply}
                disabled={busy}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {busy ? "Updating…" : "Apply"}
              </button>
            )}
          </>
        )}
      </div>
      {message && <p className="text-[11px] text-foreground-muted">{message}</p>}
    </div>
  );
};
