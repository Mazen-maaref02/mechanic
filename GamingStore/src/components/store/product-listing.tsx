import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/store/product-card";
import { getUsdToTndRate } from "@/lib/catalog/exchange";
import type { ProductWithVariants } from "@/lib/catalog/queries";

export interface ProductListingProps {
  products: ProductWithVariants[];
  emptyHref?: string;
  emptyLabel?: string;
}

const toCard = (p: ProductWithVariants): ProductCardData => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  imageUrl: p.imageUrl,
  platform: p.platform,
  region: p.region,
  deliveryType: p.deliveryType,
  categoryName: p.categoryName,
  variants: p.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceTnd: v.priceTnd,
    priceUsd: v.priceUsd,
    stock: v.stock,
    active: v.active,
  })),
});

/** Product grid with shared empty state for all listing pages. */
export async function ProductListing({ products, emptyHref = "/shop", emptyLabel = "Browse everything" }: ProductListingProps) {
  const usdToTnd = await getUsdToTndRate();

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 px-8 py-16 text-center">
        <PackageOpen className="mx-auto h-8 w-8 text-foreground-dim" />
        <p className="mt-3 font-medium text-foreground">No products match your filters</p>
        <p className="mt-1 text-sm text-foreground-muted">Try clearing the search or switching category.</p>
        <Link
          href={emptyHref}
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {emptyLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={toCard(p)} index={i} usdToTnd={usdToTnd} />
      ))}
    </div>
  );
}
