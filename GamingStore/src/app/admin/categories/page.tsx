import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order, is_active, created_at")
    .order("sort_order")
    .order("name");

  // product counts shown next to each category (inactive products included — admin view)
  const { data: counts } = await supabase.from("products").select("category_id, status");
  const countByCategory = new Map<string, { total: number; active: number }>();
  for (const p of counts ?? []) {
    const entry = countByCategory.get(p.category_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (p.status === "active") entry.active += 1;
    countByCategory.set(p.category_id, entry);
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Storefront taxonomy. Slug changes break old product links — prefer renaming over re-slugging.
        </p>
      </header>
      <CategoryManager
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          sortOrder: c.sort_order,
          isActive: c.is_active,
          productCount: countByCategory.get(c.id)?.total ?? 0,
          activeCount: countByCategory.get(c.id)?.active ?? 0,
        }))}
      />
    </div>
  );
}
