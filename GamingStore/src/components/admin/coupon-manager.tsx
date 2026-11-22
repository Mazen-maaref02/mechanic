"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Ticket, TriangleAlert } from "lucide-react";
import { saveCouponAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatPrice, type CurrencyCode } from "@/lib/money";

export interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  currency: CurrencyCode | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

interface Draft {
  id: string | null;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  currency: "" | "TND" | "USD";
  minOrderAmount: string;
  maxUses: string;
  isActive: boolean;
}

const blank: Draft = {
  id: null,
  code: "",
  type: "percentage",
  value: "10",
  currency: "",
  minOrderAmount: "",
  maxUses: "",
  isActive: true,
};

export const CouponManager = ({ coupons }: { coupons: CouponRow[] }) => {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const edit = (c?: CouponRow) =>
    setDraft(
      c
        ? {
            id: c.id,
            code: c.code,
            type: c.type,
            value: String(c.value),
            currency: (c.currency ?? "") as Draft["currency"],
            minOrderAmount: c.minOrderAmount === null ? "" : String(c.minOrderAmount),
            maxUses: c.maxUses === null ? "" : String(c.maxUses),
            isActive: c.isActive,
          }
        : { ...blank },
    );

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    const res = await saveCouponAction(
      {
        code: draft.code.trim().toUpperCase(),
        type: draft.type,
        value: Number(draft.value) || 0,
        currency: draft.currency === "" ? null : draft.currency,
        minOrderAmount: draft.minOrderAmount.trim() === "" ? null : Number(draft.minOrderAmount) || 0,
        maxUses: draft.maxUses.trim() === "" ? null : Number(draft.maxUses) || 1,
        isActive: draft.isActive,
      },
      draft.id ?? undefined,
    );
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: "err", text: res.error ?? "Save failed." });
      return;
    }
    setDraft(null);
    setMessage({ kind: "ok", text: res.info ?? "Saved." });
    router.refresh();
  };

  const describe = (c: CouponRow) =>
    c.type === "percentage"
      ? `${c.value}% off`
      : `${formatPrice(c.value, (c.currency ?? "TND") as CurrencyCode)} off`;

  return (
    <div>
      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={cn(
            "mb-4 flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
          )}
        >
          {message.kind === "ok" ? <CircleCheck className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
          {message.text}
        </p>
      )}

      <div className="mb-4">
        <button
          onClick={() => {
            setMessage(null);
            edit();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Ticket className="h-4 w-4" /> New coupon
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-dim">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="hidden px-4 py-3 sm:table-cell">Min order</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">{describe(c)}</td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {c.minOrderAmount === null ? "—" : formatPrice(c.minOrderAmount, "TND")}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {c.usedCount}{c.maxUses === null ? "" : ` / ${c.maxUses}`}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? "active" : "off"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setMessage(null);
                      edit(c);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-foreground-muted">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit coupon" : "New coupon"}</DialogTitle>
            <DialogDescription>
              Percentage: whole % (1–100). Fixed: minor units — millimes for TND, cents for USD, so 10000 = 10 TND.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Code (A–Z, 0–9, dash)</span>
                  <input
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]+/g, "") })}
                    maxLength={24}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Type</span>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}
                    className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="percentage">percentage</option>
                    <option value="fixed">fixed amount</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">
                    {draft.type === "percentage" ? "Value (whole %)" : "Value (minor units)"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={draft.type === "percentage" ? 100 : undefined}
                    value={draft.value}
                    onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 tabular-nums text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Currency (fixed only)</span>
                  <select
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value as Draft["currency"] })}
                    disabled={draft.type === "percentage"}
                    className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">— none —</option>
                    <option value="TND">TND</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Min order (TND minor units)</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.minOrderAmount}
                    onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 tabular-nums text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Max uses (blank = ∞)</span>
                  <input
                    type="number"
                    min={1}
                    value={draft.maxUses}
                    onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 tabular-nums text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="h-4 w-4 accent-current"
                />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setDraft(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={
                    busy ||
                    draft.code.trim().length < 3 ||
                    Number(draft.value) <= 0 ||
                    (draft.type === "fixed" && draft.currency === "")
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
