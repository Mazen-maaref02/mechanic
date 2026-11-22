import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Globe2 } from "lucide-react";
import { getProductBySlug } from "@/lib/catalog/queries";
import { getUsdToTndRate } from "@/lib/catalog/exchange";
import { ProductBuySection } from "@/components/store/product-buy-section";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: { title: product.name, description: product.description ?? undefined },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const usdToTnd = await getUsdToTndRate();

  if (!product) notFound();

  const purchasable = product.variants.some((v) => v.active);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link
        href={`/${product.categorySlug || "shop"}`}
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {product.categoryName || "Back to shop"}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* image + description */}
        <div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center bg-gradient-to-br from-surface-raised to-[#191b2e]">
                <span className="font-display text-4xl font-bold text-foreground-dim/30 sm:text-6xl">
                  {product.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.platform && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-foreground-muted">
                  <BadgeCheck className="h-3 w-3 text-primary" /> {product.platform}
                </span>
              )}
              {product.region && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-foreground-muted">
                  <Globe2 className="h-3 w-3 text-foreground-dim" /> {product.region}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-foreground-muted">
                {product.deliveryType === "automatic" ? "Automatic key delivery" : "Manual fulfillment"}
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground-muted">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* buy section */}
        <div className="space-y-5">
          {purchasable ? (
            <ProductBuySection
              data={{
                productId: product.id,
                productName: product.name,
                deliveryType: product.deliveryType,
                usdToTnd,
                variants: product.variants.map((v) => ({
                  id: v.id,
                  label: v.label,
                  priceTnd: v.priceTnd,
                  priceUsd: v.priceUsd,
                  stock: v.stock,
                  active: v.active,
                })),
              }}
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="font-medium">Insufficient stock</p>
              <p className="mt-1 text-sm text-foreground-muted">
                This product is out of inventory right now. Contact support to be notified.
              </p>
            </div>
          )}

          <aside className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-sm font-semibold">Safe purchasing policy</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-foreground-muted">
              <li>· Prices are locked at checkout — currency changes never affect existing orders.</li>
              <li>· Never share wallet passwords, private keys or seed phrases with anyone, including us.</li>
              <li>· Delivery details and key decryption happen only on your secure order page.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
