import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Orders" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "accent" | "danger" | "neutral"> = {
  pending_payment: "warning",
  payment_submitted: "accent",
  payment_verified: "accent",
  processing: "accent",
  completed: "success",
  cancelled: "neutral",
  refunded: "neutral",
  delivery_failed: "danger",
};

const METHOD_LABELS: Record<string, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  wafacash: "WafaCash",
  cash: "Cash",
  other: "Other",
};

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (p?: string | string[]): string | null => (Array.isArray(p) ? p[0] : p) ?? null;

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const q = first(params.q);
  const status = first(params.status);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, total_amount, currency, customer_name, customer_email, payment_method, created_at, order_items(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (status && status !== "all") query = query.eq("status", status as never);

  const { data: orders } = await query;

  const statuses = ["all", "pending_payment", "payment_submitted", "payment_verified", "processing", "completed", "cancelled", "refunded", "delivery_failed"];

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">{orders?.length ?? 0} shown (newest first)</p>
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/admin/orders">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search className="h-4 w-4 text-foreground-dim" />
            <input name="q" defaultValue={q ?? ""} placeholder="Client name, email or order #" className="w-48 bg-transparent text-sm outline-none" />
          </label>
          <select
            name="status"
            defaultValue={status ?? "all"}
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm capitalize outline-none"
            aria-label="Filter by status"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            Filter
          </button>
        </form>
      </header>

      {(orders ?? []).length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState title="No orders found" text="Adjust the filters or wait for the next checkout." />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders!.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="max-w-[200px]">
                    <Link href={`/admin/orders/${o.id}`} className="block truncate text-sm font-semibold hover:text-primary">
                      {o.customer_name}
                    </Link>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-foreground-dim">{o.order_number}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-foreground-dim">{o.customer_email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>{o.status.replace(/_/g, " ")}</Badge>
                    {o.payment_method && (
                      <span className="mt-1 block text-[10px] text-foreground-muted">
                        {METHOD_LABELS[o.payment_method] ?? o.payment_method}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{(o.order_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-sm font-semibold">{formatPrice(o.total_amount, o.currency as CurrencyCode)}</TableCell>
                  <TableCell className="text-right text-xs text-foreground-dim">
                    {new Date(o.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
