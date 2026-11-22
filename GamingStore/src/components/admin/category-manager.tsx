"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, CircleCheck, TriangleAlert } from "lucide-react";
import { saveCategoryAction } from "@/app/actions/admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  activeCount: number;
}

interface Draft {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
}

const blank: Draft = { id: null, name: "", slug: "", description: "", sortOrder: "0", isActive: true };

export const CategoryManager = ({ categories }: { categories: CategoryRow[] }) => {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const edit = (c?: CategoryRow) =>
    setDraft(
      c
        ? {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description ?? "",
            sortOrder: String(c.sortOrder),
            isActive: c.isActive,
          }
        : { ...blank },
    );

  const submit = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    const res = await saveCategoryAction(
      {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: draft.description.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      },
      draft.id ?? undefined,
    );
    setBusy(false);
    setMessage(
      res.ok
        ? { kind: "ok", text: res.info ?? "Saved." }
        : { kind: "err", text: res.error ?? "Save failed." },
    );
    if (res.ok) {
      setDraft(null);
      router.refresh();
    }
  };

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
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-dim">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="hidden px-4 py-3 sm:table-cell">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="max-w-xs truncate text-xs text-foreground-muted">{c.description}</p>}
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">{c.slug}</td>
                <td className="px-4 py-3 tabular-nums">
                  {c.activeCount}/{c.productCount} active
                </td>
                <td className="px-4 py-3">
                  <Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? "active" : "hidden"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setMessage(null);
                      edit(c);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-foreground-muted">
                  No categories yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              The slug is the public URL segment: lowercase letters, numbers and dashes only.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-foreground-muted">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={60}
                  required
                  className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })
                    }
                    maxLength={60}
                    pattern="[a-z0-9\-]+"
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Sort order</span>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={draft.sortOrder}
                    onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-foreground-muted">Description (optional)</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={300}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="h-4 w-4 accent-current"
                />
                <span>Visible on storefront</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDraft(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={busy || draft.name.trim().length < 2 || draft.slug.trim().length < 2}
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
