"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Badge, ButtonLink, Rating } from "@/components/ui";
import type { CatalogCard } from "@/lib/catalog";
import { discountPercent, formatCurrency } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/categories/placeholder.svg";

export function ProductCard({ product }: { product: CatalogCard }) {
  const outOfStock = product.totalStock <= 0;
  const lowStock = !outOfStock && product.totalStock <= product.lowStockThreshold;
  const off = discountPercent(product.listPrice, product.fromPrice);
  const initialSrc = product.images[0] || FALLBACK_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      {/* ── Image ─────────────────────────────────────────── */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-50"
      >
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
          <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Quick View
          </span>
        </div>

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 z-20 flex flex-col items-start gap-1">
          {off > 0 && (
            <Badge tone="danger" className="shadow-sm">
              {off}% OFF
            </Badge>
          )}
          {product.hasWholesale && (
            <Badge tone="brand" className="shadow-sm">
              Wholesale
            </Badge>
          )}
        </div>

        {/* Out of stock */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        {/* Brand / Category */}
        <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-brand-600">
          {product.brand ?? product.categoryName}
        </p>

        {/* Name */}
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          <Link href={`/products/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className="mt-2">
          <Rating value={product.ratingAvg} count={product.ratingCount} />
        </div>

        {/* Price */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {product.variantCount > 1 && (
            <span className="text-[11px] text-slate-500">From</span>
          )}
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(product.fromPrice, { decimals: false })}
          </span>
          {off > 0 && (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(product.listPrice, { decimals: false })}
            </span>
          )}
        </div>

        {/* MOQ */}
        <p className="mt-1 text-[11px] text-slate-500">
          MOQ: {product.moq} {product.moq === 1 ? "piece" : "pieces"}
          {product.variantCount > 1 && ` · ${product.variantCount} variants`}
        </p>

        {/* Stock badge */}
        <div className="mt-2 min-h-5">
          {lowStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Only {product.totalStock} left
            </span>
          )}
          {!outOfStock && !lowStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              In Stock
            </span>
          )}
        </div>

        {/* Actions */}
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
            {outOfStock ? "Notify Me" : "Add to Cart"}
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
