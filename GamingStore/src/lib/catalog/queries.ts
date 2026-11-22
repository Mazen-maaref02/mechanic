import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface VariantPublic {
  id: string;
  label: string;
  sku: string;
  priceTnd: number;
  priceUsd: number;
  /** available count: integer stock, or live key inventory count. null = manual/unlimited */
  stock: number | null;
  active: boolean;
}

export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  platform: string | null;
  region: string | null;
  deliveryType: "manual" | "automatic";
  categoryName: string;
  categorySlug: string;
  variants: VariantPublic[];
}

export interface CatalogFilter {
  categorySlug?: string;
  search?: string;
  platform?: string;
}

/**
 * Fetch the active catalog with public-safe fields only.
 * Digital keys are NEVER exposed — only aggregate counts.
 */
export async function getCatalog(filter: CatalogFilter = {}): Promise<ProductWithVariants[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, name, slug, description, image_url, platform, region, delivery_type, category_id")
    .eq("status", "active")
    .order("name");

  if (filter.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filter.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }
  if (filter.platform) {
    query = query.eq("platform", filter.platform);
  }
  if (filter.search) {
    const q = filter.search.trim();
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: products, error } = await query;
  if (error) throw new Error(`Catalog fetch failed: ${error.message}`);
  if (!products || products.length === 0) return [];

  const categoryIds = [...new Set(products.map((p) => p.category_id))];
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .in("id", categoryIds);
  const categoryMap = new Map<string, { name: string; slug: string }>();
  for (const c of categories ?? []) categoryMap.set(c.id, c);

  const productIds = products.map((p) => p.id);
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, label, sku, price_tnd, price_usd, stock, is_active, sort_order")
    .in("product_id", productIds)
    .order("sort_order");

  const variantsByProduct = new Map<string, VariantPublic[]>();
  for (const v of variants ?? []) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
    // 0008: stock limits removed — every variant is always orderable; the
    // team fulfills each order manually (sends keys / performs top-ups).
    const stock = null;
    variantsByProduct.get(v.product_id)!.push({
      id: v.id,
      label: v.label,
      sku: v.sku,
      priceTnd: v.price_tnd,
      priceUsd: v.price_usd,
      stock,
      active: v.is_active,
    });
  }

  return products.map((p) => {
    const category = categoryMap.get(p.category_id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      imageUrl: p.image_url,
      platform: p.platform,
      region: p.region,
      deliveryType: p.delivery_type,
      categoryName: category?.name ?? "",
      categorySlug: category?.slug ?? "",
      variants: variantsByProduct.get(p.id) ?? [],
    };
  });
}

/** Single product by slug for detail page (404 handled by caller). */
export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const all = await getCatalog();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getFeatured(limit = 6): Promise<ProductWithVariants[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("is_featured", true)
    .eq("status", "active");
  const featuredIds = new Set((data ?? []).map((d) => d.id));
  const catalog = await getCatalog();
  return catalog.filter((p) => featuredIds.has(p.id)).slice(0, limit);
}

export async function getCategories(): Promise<{ id: string; name: string; slug: string; description: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}
