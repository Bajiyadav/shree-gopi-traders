import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Package, ShieldCheck, Truck } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { getCurrentCustomerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { ProductGrid } from "@/components/products/ProductCard";
import { PurchasePanel, type PanelVariant } from "@/components/products/PurchasePanel";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductTabs } from "@/components/products/ProductTabs";
import { Badge, Card, Rating, SectionHeading } from "@/components/ui";
import { WhatsAppButton } from "@/components/layout/WhatsApp";
import { formatDate } from "@/lib/utils";

export const revalidate = 120;

/** Pre-render the catalogue's product pages at build time. */
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
    take: 100,
  });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await prisma.product.findFirst({
    where: { slug: params.slug, isActive: true },
    include: { category: { select: { name: true } } },
  });
  if (!product) return { title: "Product not found" };

  const description =
    product.description?.slice(0, 160) ??
    `Buy ${product.name} at wholesale rates from ${siteConfig.brandName}.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | ${siteConfig.brandName}`,
      description,
      type: "website",
      url: `${siteConfig.siteUrl}/products/${product.slug}`,
      images: product.images.length > 0 ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const [related, customerId] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id, 4),
    getCurrentCustomerId(),
  ]);

  const variants: PanelVariant[] = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: Number(v.price),
    salePrice: v.salePrice === null ? null : Number(v.salePrice),
    stock: v.inventory?.stock ?? 0,
    lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
    tiers: v.wholesaleTiers.map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty,
      pricePerUnit: Number(t.pricePerUnit),
    })),
  }));

  // "Bulk pricing" means a tier actually cuts the price above qty 1 — not
  // merely that tier rows exist.
  const hasBulkPricing = product.variants.some((v) =>
    v.wholesaleTiers.some((t) => t.minQty > 1 && Number(t.pricePerUnit) < Number(v.price))
  );

  const images = product.images.length > 0 ? product.images : ["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"];
  const specs = (product.specs ?? {}) as Record<string, string>;

  // Prices that can honestly be quoted: a finite number from a real variant.
  // A product with no active variant contributes nothing here, which is what
  // keeps the offer block below out of the markup entirely.
  const offerPrices = variants
    .map((v) => v.salePrice ?? v.price)
    .filter((p) => Number.isFinite(p));
  const listPrices = variants.map((v) => v.price).filter((p) => Number.isFinite(p));

  // Structured data helps the product surface in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: images.map((i) => `${siteConfig.siteUrl}${i}`),
    category: product.category.name,
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.ratingAvg),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
    // Only quote a price when a variant actually carries one. Spreading an
    // empty array into Math.min/max yields ±Infinity, which JSON.stringify
    // writes as null — invalid structured data. A product with nothing
    // purchasable omits the offer block entirely rather than publishing a
    // price it cannot honour.
    ...(offerPrices.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: Math.min(...offerPrices),
            highPrice: Math.max(...listPrices),
            offerCount: offerPrices.length,
            availability: variants.some((v) => v.stock > 0)
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link href="/" className="text-slate-400 hover:text-brand-700 transition-colors">Home</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href="/products" className="text-slate-400 hover:text-brand-700 transition-colors">Products</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href={`/categories/${product.category.slug}`} className="text-slate-400 hover:text-brand-700 transition-colors">
          {product.category.name}
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="font-medium text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <ProductGallery images={images} alt={product.name} />

        {/* Buy box */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              {product.brand ?? product.category.name}
            </p>
            {hasBulkPricing && <Badge tone="brand">Bulk pricing available</Badge>}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Rating value={Number(product.ratingAvg)} count={product.ratingCount} size="md" />
            <span className="text-sm text-slate-500">SKU: {product.sku}</span>
          </div>

          <div className="mt-6">
            <PurchasePanel
              variants={variants}
              isSignedIn={Boolean(customerId)}
              productSlug={product.slug}
              allowBackorder={product.allowBackorder}
              moq={product.moq}
              productName={product.name}
              sku={product.sku}
            />
          </div>

          {/* Delivery + business info */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Truck, title: "Cash on Delivery", body: "Free delivery above ₹5,000. ₹199 flat below.", color: "bg-emerald-50 text-emerald-700" },
              { icon: Package, title: "Dispatch in 24–48 hrs", body: "Delivered in 3–7 working days.", color: "bg-blue-50 text-blue-700" },
              { icon: FileText, title: "GST Invoice", body: "Add your GST number at checkout.", color: "bg-amber-50 text-amber-700" },
              { icon: ShieldCheck, title: "Professional Grade", body: "Supplied in salon trade packs.", color: "bg-brand-50 text-brand-700" },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
            <p className="text-sm font-bold text-brand-900">📦 Buying in larger quantities?</p>
            <p className="mt-1.5 text-sm text-brand-700">
              Raise a bulk enquiry for a custom quotation on orders beyond the listed tiers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/bulk-orders"
                className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 transition-colors"
              >
                Request Bulk Quote
              </Link>
              <WhatsAppButton
                variant="outline"
                message={`Hello ${siteConfig.brandName}, I'd like a bulk quote for ${product.name}.`}
              >
                Ask on WhatsApp
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </div>

      {/* Description / specs / ingredients / usage / reviews */}
      <div className="mt-14">
        <ProductTabs
          description={product.description}
          specs={specs}
          ingredients={product.ingredients}
          usageInstructions={product.usageInstructions}
          ratingAvg={Number(product.ratingAvg)}
          ratingCount={product.ratingCount}
          reviews={product.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
            author: r.customer.businessProfile?.businessName ?? r.customer.name,
          }))}
        />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-14">
          <SectionHeading
            title="Related Products"
            description={`More from ${product.category.name}`}
          />
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
