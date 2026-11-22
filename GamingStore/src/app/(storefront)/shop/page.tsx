import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductListing } from "@/components/store/product-listing";
import { getCatalog } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Shop — all products",
};

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const firstParam = (p?: string | string[]): string | null =>
  (Array.isArray(p) ? p[0] : p) ?? null;

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const platform = firstParam(params.platform);

  const all = await getCatalog({ search: q ?? undefined, platform: platform ?? undefined });
  const platforms = [...new Set((await getCatalog()).map((p) => p.platform).filter(Boolean))] as string[];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Shop everything</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Gift cards, game keys and topping services — TND and USD.
        </p>
      </header>
      <Suspense>
        <CatalogFilters
          platforms={platforms}
          currentPlatform={platform}
          currentSearch={q}
          basePath="/shop"
        />
      </Suspense>
      <div className="mt-6">
        <Suspense>
          <ProductListing products={all} />
        </Suspense>
      </div>
    </div>
  );
}
