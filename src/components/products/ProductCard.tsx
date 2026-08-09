import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, Rating } from "@/components/ui";
import type { CatalogCard } from "@/lib/catalog";
import { discountPercent, formatCurrency } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/categories/placeholder.svg";

export function ProductCard({ product }: { product: CatalogCard }) {
  const outOfStock = product.totalStock <= 0;
  const lowStock = !outOfStock && product.totalStock <= product.lowStockThreshold;
  const off = discountPercent(product.listPrice, product.fromPrice);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-slate-50"
      >
        <Image
          src={product.images[0] || FALLBACK_IMAGE}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-black tracking-widest text-amber-400 shadow-md border border-amber-400/50 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            SGT VERIFIED
          </span>
          {off > 0 && <Badge tone="danger">{off}% OFF</Badge>}
          {product.hasWholesale && <Badge tone="brand">Wholesale</Badge>}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {product.brand ?? product.categoryName}
        </p>

        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-900">
          <Link href={`/products/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        <div className="mt-2">
          <Rating value={product.ratingAvg} count={product.ratingCount} />
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {product.variantCount > 1 && (
            <span className="text-[11px] text-slate-500">From</span>
          )}
          <span className="text-base font-semibold text-slate-900">
            {formatCurrency(product.fromPrice, { decimals: false })}
          </span>
          {off > 0 && (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(product.listPrice, { decimals: false })}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          MOQ: {product.moq} {product.moq === 1 ? "piece" : "pieces"}
          {product.variantCount > 1 && ` · ${product.variantCount} variants`}
        </p>

        <div className="mt-2 min-h-5">
          {lowStock && (
            <span className="text-xs font-medium text-amber-700">
              Only {product.totalStock} left
            </span>
          )}
          {!outOfStock && !lowStock && (
            <span className="text-xs font-medium text-emerald-700">In Stock</span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <ButtonLink
            href={`/products/${product.slug}`}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            View Details
          </ButtonLink>
          <ButtonLink
            href={`/products/${product.slug}#buy`}
            variant={outOfStock ? "ghost" : "primary"}
            size="sm"
            className="flex-1"
            aria-disabled={outOfStock}
          >
            {outOfStock ? "Notify" : "Add to Cart"}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: CatalogCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
