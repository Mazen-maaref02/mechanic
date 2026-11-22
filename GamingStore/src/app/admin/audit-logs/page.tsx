import type { Metadata } from "next";
import { ShieldQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Audit logs" };

const ACTION_TONE: Record<string, string> = {
  payment: "text-emerald-300",
  inventory: "text-sky-300",
  user: "text-amber-300",
  delivery: "text-violet-300",
  topup: "text-amber-300",
};

interface AuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAuditLogsPage({ searchParams }: AuditPageProps) {
  await requireAdmin();
  const { action } = await searchParams;
  const filter = (Array.isArray(action) ? action[0] : action)?.trim() ?? "";

  const supabase = await createClient();
  let req = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter.length > 0) req = req.eq("action", filter);
  const { data: logs } = await req;
  const list = logs ?? [];

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Audit logs</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">
            Append-only trail of admin and system actions. Rows are inserted by DB functions and service role only —
            nothing here can be edited or deleted from the app.
          </p>
        </div>
        <form className="flex gap-2" action="/admin/audit-logs">
          <input
            name="action"
            defaultValue={filter}
            placeholder="e.g. payment.verified"
            className="w-56 rounded-lg border border-border bg-background-raised px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </form>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-dim">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="hidden px-4 py-3 sm:table-cell">Entity</th>
              <th className="hidden px-4 py-3 md:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {list.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-foreground-muted">
                  {new Date(l.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}
                </td>
                <td className="px-4 py-2.5">
                  <span className={ACTION_TONE[l.action.split(".")[0] ?? ""] ?? "text-foreground"}>{l.action}</span>
                </td>
                <td className="px-4 py-2.5">
                  {l.entity_type ? (
                    <>
                      {l.entity_type}
                      {l.entity_id && <span className="text-foreground-dim"> · {l.entity_id.slice(0, 8)}…</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden max-w-sm truncate px-4 py-2.5 md:table-cell">
                  {l.metadata ? JSON.stringify(l.metadata) : "—"}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-foreground-muted">
                  <ShieldQuestion className="mx-auto mb-2 h-6 w-6 text-foreground-dim" />
                  {filter ? "No entries match this action filter." : "No audit entries yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-foreground-dim">Showing the {list.length} most recent entries.</p>
    </div>
  );
}
