import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductManager } from "@/components/admin/product-manager";

export const metadata: Metadata = { title: "Products" };

export interface AdminVariant {
  id: string;
  label: string;
  sku: string;
  priceTnd: number;
  priceUsd: number;
  stock: number | null;
  isActive: boolean;
  sortOrder: number;
  availableKeys: number;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  platform: string | null;
  region: string | null;
  deliveryType: "manual" | "automatic";
  status: "draft" | "active" | "inactive";
  isFeatured: boolean;
  variants: AdminVariant[];
}

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: variants }, { data: keyCounts }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, category_id, name, slug, description, image_url, platform, region, delivery_type, status, is_featured, categories(name)")
      .order("name"),
    supabase.from("product_variants").select("*").order("sort_order").order("sku"),
    supabase.from("digital_keys").select("id, variant_id, status"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  const availableByVariant = new Map<string, number>();
  for (const k of keyCounts ?? []) {
    if (k.status !== "available") continue;
    availableByVariant.set(k.variant_id, (availableByVariant.get(k.variant_id) ?? 0) + 1);
  }

  const list: AdminProduct[] = (products ?? []).map((p) => ({
    id: p.id,
    categoryId: p.category_id,
    categoryName: (p.categories as { name: string } | null)?.name ?? "—",
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.image_url,
    platform: p.platform,
    region: p.region,
    deliveryType: p.delivery_type as "manual" | "automatic",
    status: p.status as "draft" | "active" | "inactive",
    isFeatured: p.is_featured,
    variants: (variants ?? [])
      .filter((v) => v.product_id === p.id)
      .map((v) => ({
        id: v.id,
        label: v.label,
        sku: v.sku,
        priceTnd: v.price_tnd,
        priceUsd: v.price_usd,
        stock: v.stock,
        isActive: v.is_active,
        sortOrder: v.sort_order,
        availableKeys: availableByVariant.get(v.id) ?? 0,
      })),
  }));

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Catalog authority — storefront prices and stock numbers come from these rows only.
        </p>
      </header>
      <ProductManager
        products={list}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
