import type { ReactNode } from "react";
import { Suspense } from "react";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductListing } from "@/components/store/product-listing";
import { getCatalog } from "@/lib/catalog/queries";

const firstParam = (p?: string | string[]): string | null =>
  (Array.isArray(p) ? p[0] : p) ?? null;

export async function CategoryView({
  slug,
  title,
  description,
  basePath,
  searchParams,
}: {
  slug: string;
  title: string;
  description: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<ReactNode> {
  const q = firstParam(searchParams.q);
  const platform = firstParam(searchParams.platform);

  const products = await getCatalog({
    categorySlug: slug,
    search: q ?? undefined,
    platform: platform ?? undefined,
  });

  const platformsInCategory = [
    ...new Set(
      (await getCatalog({ categorySlug: slug })).map((p) => p.platform).filter(Boolean),
    ),
  ] as string[];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      </header>
      <Suspense>
        <CatalogFilters
          platforms={platformsInCategory}
          currentPlatform={platform}
          currentSearch={q}
          basePath={basePath}
        />
      </Suspense>
      <div className="mt-6">
        <Suspense>
          <ProductListing products={products} emptyHref={basePath} emptyLabel={`All ${title.toLowerCase()}`} />
        </Suspense>
      </div>
    </div>
  );
}
