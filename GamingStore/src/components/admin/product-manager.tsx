"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck, Loader2, Minus, PackageX, Pencil, Plus, TriangleAlert,
} from "lucide-react";
import {
  archiveProductAction, saveProductAction, saveVariantAction,
} from "@/app/actions/admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/money";
import type { AdminProduct, AdminVariant } from "@/app/admin/products/page";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductDraft {
  id: string | null;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  platform: string;
  region: string;
  deliveryType: "manual" | "automatic";
  status: "draft" | "active" | "inactive";
  isFeatured: boolean;
}

const blankDraft: ProductDraft = {
  id: null,
  categoryId: "",
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  platform: "",
  region: "",
  deliveryType: "automatic",
  status: "active",
  isFeatured: false,
};

interface VariantDraft {
  id: string | null;
  label: string;
  sku: string;
  priceTnd: string;
  priceUsd: string;
  stock: string;
  isActive: boolean;
  sortOrder: string;
}

const STATUS_VARIANT: Record<AdminProduct["status"], "accent" | "success" | "neutral"> = {
  active: "success",
  draft: "neutral",
  inactive: "accent",
};

export const ProductManager = ({
  products,
  categories,
}: {
  products: AdminProduct[];
  categories: CategoryOption[];
}) => {
  const router = useRouter();
  const [draft, setDraft] = React.useState<ProductDraft | null>(null);
  const [variantDrafts, setVariantDrafts] = React.useState<VariantDraft[]>([]);
  const [archiving, setArchiving] = React.useState<AdminProduct | null>(null);
  const [archiveConfirm, setArchiveConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const toVariantDraft = (v: AdminVariant): VariantDraft => ({
    id: v.id,
    label: v.label,
    sku: v.sku,
    priceTnd: String(v.priceTnd),
    priceUsd: String(v.priceUsd),
    stock: v.stock === null ? "" : String(v.stock),
    isActive: v.isActive,
    sortOrder: String(v.sortOrder),
  });

  const blankVariant = (): VariantDraft => ({
    id: null,
    label: "",
    sku: "",
    priceTnd: "0",
    priceUsd: "0",
    stock: "",
    isActive: true,
    sortOrder: "0",
  });

  const openEdit = (p?: AdminProduct) => {
    setMessage(null);
    setVariantDrafts(p ? p.variants.map(toVariantDraft) : []);
    setDraft(
      p
        ? {
            id: p.id,
            categoryId: p.categoryId,
            name: p.name,
            slug: p.slug,
            description: p.description ?? "",
            imageUrl: p.imageUrl ?? "",
            platform: p.platform ?? "",
            region: p.region ?? "",
            deliveryType: p.deliveryType,
            status: p.status,
            isFeatured: p.isFeatured,
          }
        : { ...blankDraft, categoryId: categories[0]?.id ?? "" },
    );
  };

  const saveProduct = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    const res = await saveProductAction(
      {
        categoryId: draft.categoryId,
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: draft.description.trim() || null,
        imageUrl: draft.imageUrl.trim() || null,
        platform: draft.platform.trim() || null,
        region: draft.region.trim() || null,
        deliveryType: draft.deliveryType,
        status: draft.status,
        isFeatured: draft.isFeatured,
      },
      draft.id ?? undefined,
    );
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: "err", text: res.error ?? "Save failed." });
      return;
    }
    // save the touched variants after the product row exists
    if (draft.id && variantDrafts.length > 0) {
      for (const v of variantDrafts) {
        if (v.label.trim().length === 0 || v.sku.trim().length < 2) continue;
        const vres = await saveVariantAction(
          {
            productId: draft.id,
            label: v.label.trim(),
            sku: v.sku.trim().toUpperCase(),
            priceTnd: Number(v.priceTnd) || 0,
            priceUsd: Number(v.priceUsd) || 0,
            stock: v.stock.trim() === "" ? null : Math.max(0, Number(v.stock) || 0),
            isActive: v.isActive,
            sortOrder: Number(v.sortOrder) || 0,
          },
          v.id ?? undefined,
        );
        if (!vres.ok) {
          setMessage({ kind: "err", text: `Product saved, but variant ${v.sku} failed: ${vres.error}` });
          return; // keep the dialog open so nothing is silently lost
        }
      }
    }
    setMessage({ kind: "ok", text: res.info ?? "Saved." });
    setDraft(null);
    router.refresh();
  };

  const archive = async () => {
    if (!archiving) return;
    setBusy(true);
    const res = await archiveProductAction(archiving.id, archiveConfirm.trim());
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: "err", text: res.error ?? "Archive failed." });
      return;
    }
    setArchiving(null);
    setArchiveConfirm("");
    setMessage({ kind: "ok", text: res.info ?? "Archived." });
    router.refresh();
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
          onClick={() => openEdit()}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
        {categories.length === 0 && (
          <span className="ml-3 text-xs text-foreground-dim">Create a category first.</span>
        )}
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <article key={p.id} className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  {p.isFeatured && <Badge variant="accent">featured</Badge>}
                  <Badge variant="neutral">{p.deliveryType === "automatic" ? "auto-delivery" : "manual"}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground-muted">
                  {p.categoryName} · {p.slug}
                  {p.platform ? ` · ${p.platform}` : ""}
                  {p.region ? ` · ${p.region}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
                >
                  <Pencil className="h-3.5 w-3.5" /> {p.variants.length > 0 || p.id !== "" ? "Edit" : "Edit"}
                </button>
                <button
                  onClick={() => {
                    setMessage(null);
                    setArchiving(p);
                    setArchiveConfirm("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10"
                >
                  <PackageX className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            </div>

            {p.variants.length > 0 && (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="text-left uppercase tracking-wider text-foreground-dim">
                    <tr>
                      <th className="px-4 py-2">Variant</th>
                      <th className="px-4 py-2">SKU</th>
                      <th className="px-4 py-2">Price TND</th>
                      <th className="px-4 py-2">Price USD</th>
                      <th className="px-4 py-2">Stock cap</th>
                      <th className="px-4 py-2">Keys ready</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {p.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-2 font-medium">{v.label}</td>
                        <td className="px-4 py-2 font-mono">{v.sku}</td>
                        <td className="px-4 py-2 tabular-nums">{formatPrice(v.priceTnd, "TND")}</td>
                        <td className="px-4 py-2 tabular-nums">{formatPrice(v.priceUsd, "USD")}</td>
                        <td className="px-4 py-2 tabular-nums">{v.stock === null ? "unlimited" : v.stock}</td>
                        <td className="px-4 py-2 tabular-nums">
                          <span className={v.availableKeys === 0 ? "text-red-300" : "text-emerald-300"}>
                            {v.availableKeys}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={v.isActive ? "success" : "neutral"}>{v.isActive ? "active" : "off"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {p.variants.length === 0 && (
              <p className="border-t border-border px-4 py-2.5 text-xs text-amber-300">
                No variants yet — without at least one variant this product cannot be purchased.
              </p>
            )}
          </article>
        ))}
        {products.length === 0 && (
          <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-foreground-muted">
            No products yet.
          </p>
        )}
      </div>

      {/* ── product editor ─────────────────────────────────────────── */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              Variant-level pricing is what customers actually pay; the exchange-rate snapshot applies at checkout.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-[130px_1fr_1fr]">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Category</span>
                  <select
                    value={draft.categoryId}
                    onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Name</span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    maxLength={120}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })
                    }
                    maxLength={120}
                    pattern="[a-z0-9\-]+"
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground-muted">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={2000}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Image URL</span>
                  <input
                    value={draft.imageUrl}
                    onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Platform</span>
                  <input
                    value={draft.platform}
                    onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                    maxLength={40}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Region</span>
                  <input
                    value={draft.region}
                    onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                    maxLength={60}
                    className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Delivery</span>
                  <select
                    value={draft.deliveryType}
                    onChange={(e) => setDraft({ ...draft, deliveryType: e.target.value as "manual" | "automatic" })}
                    className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="automatic">automatic</option>
                    <option value="manual">manual</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Status</span>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductDraft["status"] })}
                    className="w-full rounded-lg border border-border bg-background-raised px-2.5 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="inactive">inactive</option>
                  </select>
                </label>
                <label className="flex items-end pb-2 text-sm sm:col-span-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.isFeatured}
                      onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                      className="h-4 w-4 accent-current"
                    />
                    Featured on home page
                  </span>
                </label>
              </div>

              {draft.id && (
                <fieldset className="rounded-lg border border-border p-3">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground-dim">
                    Variants
                  </legend>
                  <div className="space-y-2">
                    {variantDrafts.map((v, idx) => (
                      <div key={v.id ?? `new-${idx}`} className="grid items-end gap-2 sm:grid-cols-[1fr_110px_92px_92px_84px_36px]">
                        <label className="block text-xs">
                          <span className="block text-foreground-muted">Label</span>
                          <input
                            value={v.label}
                            onChange={(e) =>
                              setVariantDrafts((vs) => vs.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                            }
                            className="w-full rounded-md border border-border bg-background-raised px-2 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="block text-foreground-muted">SKU</span>
                          <input
                            value={v.sku}
                            onChange={(e) =>
                              setVariantDrafts((vs) =>
                                vs.map((x, i) =>
                                  i === idx ? { ...x, sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-]+/g, "-") } : x,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-border bg-background-raised px-2 py-1.5 font-mono text-sm outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="block text-foreground-muted">TND (millimes)</span>
                          <input
                            type="number"
                            min={0}
                            value={v.priceTnd}
                            onChange={(e) =>
                              setVariantDrafts((vs) => vs.map((x, i) => (i === idx ? { ...x, priceTnd: e.target.value } : x)))
                            }
                            className="w-full rounded-md border border-border bg-background-raised px-2 py-1.5 text-sm tabular-nums outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="block text-foreground-muted">USD (cents)</span>
                          <input
                            type="number"
                            min={0}
                            value={v.priceUsd}
                            onChange={(e) =>
                              setVariantDrafts((vs) => vs.map((x, i) => (i === idx ? { ...x, priceUsd: e.target.value } : x)))
                            }
                            className="w-full rounded-md border border-border bg-background-raised px-2 py-1.5 text-sm tabular-nums outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="block text-foreground-muted">Stk cap</span>
                          <input
                            type="number"
                            min={0}
                            value={v.stock}
                            placeholder="∞"
                            onChange={(e) =>
                              setVariantDrafts((vs) => vs.map((x, i) => (i === idx ? { ...x, stock: e.target.value } : x)))
                            }
                            className="w-full rounded-md border border-border bg-background-raised px-2 py-1.5 text-sm tabular-nums outline-none focus:border-primary"
                          />
                        </label>
                        <button
                          onClick={() => setVariantDrafts((vs) => vs.filter((_, i) => i !== idx))}
                          className="grid h-9 w-9 place-items-center rounded-md border border-border text-foreground-muted hover:bg-surface-hover"
                          aria-label="Remove variant"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setVariantDrafts((vs) => [...vs, blankVariant()])}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-foreground-muted hover:bg-surface-hover"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add variant
                  </button>
                  <p className="mt-2 text-[11px] text-foreground-dim">
                    Removing a row only hides it from the save list — existing variants stay until re-saved without it.
                  </p>
                </fieldset>
              )}
              {!draft.id && (
                <p className="rounded-lg bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
                  Save the product first, then edit it again to add variants and import keys.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setDraft(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProduct}
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

      {/* ── archive (destructive, confirm-by-slug) ────────────────── */}
      <Dialog open={archiving !== null} onOpenChange={(o) => !o && setArchiving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive product</DialogTitle>
            <DialogDescription>
              Archived products disappear from the storefront but keep their order history for audit. Type the slug{" "}
              <span className="font-mono text-foreground">{archiving?.slug}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <input
            value={archiveConfirm}
            onChange={(e) => setArchiveConfirm(e.target.value)}
            placeholder={archiving?.slug}
            className="w-full rounded-lg border border-border bg-background-raised px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setArchiving(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={archive}
              disabled={busy || archiveConfirm.trim() !== archiving?.slug}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Archive
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
