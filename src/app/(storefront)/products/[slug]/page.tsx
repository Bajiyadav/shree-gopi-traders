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

  const images = product.images.length > 0 ? product.images : ["/images/categories/placeholder.svg"];
  const specs = (product.specs ?? {}) as Record<string, string>;

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
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...variants.map((v) => v.salePrice ?? v.price)),
      highPrice: Math.max(...variants.map((v) => v.price)),
      offerCount: variants.length,
      availability: variants.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="hover:text-brand-700">Products</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-brand-700">
          {product.category.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-900">{product.name}</span>
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
              allowBackorder={product.allowBackorder}
            />
          </div>

          {/* Delivery + business info */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Truck, title: "Cash on Delivery", body: "Free delivery above ₹5,000. ₹199 flat below." },
              { icon: Package, title: "Dispatch in 24–48 hrs", body: "Delivered in 3–7 working days." },
              { icon: FileText, title: "GST Invoice", body: "Add your GST number at checkout." },
              { icon: ShieldCheck, title: "Professional Grade", body: "Supplied in salon trade packs." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-medium text-brand-900">Buying in larger quantities?</p>
            <p className="mt-1 text-sm text-brand-800">
              Raise a bulk enquiry for a custom quotation on orders beyond the listed tiers.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/bulk-orders"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
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

      {/* Description + specs */}
      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Product Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {product.description ?? "No description available for this product."}
          </p>
        </div>
        {Object.keys(specs).length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold">Specifications</h2>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">{key}</dt>
                  <dd className="text-right font-medium text-slate-900">{String(value)}</dd>
                </div>
              ))}
              {product.weight && (
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">Weight</dt>
                  <dd className="text-right font-medium text-slate-900">{String(product.weight)} kg</dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-14">
        <SectionHeading
          title="Customer Reviews"
          description={
            product.ratingCount > 0
              ? `${Number(product.ratingAvg).toFixed(1)} out of 5 · ${product.ratingCount} review${product.ratingCount === 1 ? "" : "s"}`
              : "Be the first business to review this product after your order is delivered."
          }
        />
        {product.reviews.length === 0 ? (
          <Card className="p-6 text-sm text-slate-600">
            No approved reviews yet for this product.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {product.reviews.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <Rating value={review.rating} />
                  <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.comment}</p>
                )}
                <p className="mt-3 text-xs font-medium text-slate-900">
                  {review.customer.businessProfile?.businessName ?? review.customer.name}
                </p>
              </Card>
            ))}
          </div>
        )}
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
