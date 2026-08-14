import Image from "next/image";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Boxes,
  Headphones,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import {
  getActiveCategories,
  getNewestProducts,
  getPopularProducts,
  hydrateCards,
} from "@/lib/catalog";
import { ProductGrid } from "@/components/products/ProductCard";
import { ButtonLink, Card, Rating, SectionHeading } from "@/components/ui";
import { WhatsAppBanner, WhatsAppButton } from "@/components/layout/WhatsApp";
import { formatCurrency } from "@/lib/utils";
import { HeroVideo } from "@/components/home/HeroVideo";

export const revalidate = 300;

const BENEFITS = [
  {
    icon: BadgeIndianRupee,
    title: "Wholesale Pricing",
    body: "Quantity-based rates apply automatically. Buy 5, buy 10, buy 50 — the price per unit drops as you scale.",
  },
  {
    icon: Boxes,
    title: "One Supplier, Everything",
    body: "Hair care, skin, nails, waxing, makeup, furniture, equipment and consumables in a single order.",
  },
  {
    icon: PackageCheck,
    title: "Professional Grade Only",
    body: "Salon-strength formulations and commercial equipment built for daily back-to-back use.",
  },
  {
    icon: Truck,
    title: "Cash on Delivery",
    body: "Pay when your stock arrives. Free delivery on orders above ₹5,000 across serviceable pincodes.",
  },
  {
    icon: ShieldCheck,
    title: "GST Invoicing",
    body: "Add your GST number at checkout and claim input credit on every business purchase.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    body: "Talk to a real person on WhatsApp for product advice, rate cards and bulk quotations.",
  },
];

/**
 * Four things the store actually does, stated plainly.
 *
 * Deliberately absent: "100% Original / Genuine Products" and "Lowest Prices
 * Guaranteed". This is a reseller — it cannot certify a manufacturer's
 * authenticity, and it has no visibility into competitors' pricing. Both would
 * be unverifiable claims presented as fact, and under the Consumer Protection
 * Act 2019 an unsubstantiated superiority claim is a misleading advertisement.
 * Tiered pricing, bulk quotes, tracked delivery and COD are all real features
 * of this system and sell it honestly.
 */
const VALUE_PROPS = [
  {
    icon: BadgeIndianRupee,
    title: "Wholesale Tier Pricing",
    detail: "Per-unit rates fall as your order quantity rises. Every tier is listed on the product page.",
  },
  {
    icon: Boxes,
    title: "Bulk Order Quotes",
    detail: "Need more than the listed tiers? Raise an enquiry and we'll quote your quantity.",
  },
  {
    icon: Truck,
    title: "Pan India Delivery",
    detail: "Dispatched with a courier and tracking number you can follow from your account.",
  },
  {
    icon: Headphones,
    title: "Direct Support",
    detail: "Message us on WhatsApp for stock checks, quotes or order updates.",
  },
] as const;

export default async function HomePage() {
  const [categories, popular, newest, testimonials, stats] = await Promise.all([
    getActiveCategories(),
    getPopularProducts(8),
    getNewestProducts(4),
    prisma.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 }, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        product: { select: { name: true } },
        customer: {
          select: { name: true, businessProfile: { select: { businessName: true } } },
        },
      },
    }),
    Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    ]),
  ]);

  const [productCount, categoryCount, customerCount, orderCount] = stats;

  // Equipment + furniture + barber supplies get their own rail
  const equipmentCategories = categories.filter((c) =>
    ["professional-equipment", "salon-furniture", "barber-supplies"].includes(c.slug)
  );
  const equipmentProducts = await prisma.product.findMany({
    where: { isActive: true, categoryId: { in: equipmentCategories.map((c) => c.id) } },
    orderBy: { basePrice: "desc" },
    take: 8,
    select: { id: true },
  });
  const equipment = await hydrateCards(equipmentProducts.map((p) => p.id));

  // Salon essentials — hair care, skin care, color treatment, waxing & makeup
  const essentialCategories = categories.filter((c) =>
    ["hair-care", "skin-care", "hair-color-treatment", "waxing", "makeup"].includes(c.slug)
  );
  const essentialProducts = await prisma.product.findMany({
    where: { isActive: true, categoryId: { in: essentialCategories.map((c) => c.id) } },
    orderBy: { ratingCount: "desc" },
    take: 8,
    select: { id: true },
  });
  const essentials = await hydrateCards(essentialProducts.map((p) => p.id));

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-50 via-white to-slate-50">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              Your One Stop
              <br />
              <span className="text-brand-700">Salon &amp; Beauty</span>
              <br />
              Supply Partner
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {siteConfig.supportingText} Order at wholesale rates, pay cash on
              delivery, and restock without chasing five different suppliers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">
                Shop Now
              </ButtonLink>
              {siteConfig.whatsappNumber && (
                <WhatsAppButton
                  className="h-12 rounded-lg border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 hover:bg-slate-50"
                  message={`Hello ${siteConfig.brandName}, I'd like to know more about your wholesale rates.`}
                >
                  Chat on WhatsApp
                </WhatsAppButton>
              )}
            </div>

            {/* Quick product search */}
            <form action="/products" className="mt-6 flex max-w-lg overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md focus-within:border-brand-500 transition-colors">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search shampoo, chairs, wax…"
                  aria-label="Search products"
                  className="h-12 w-full border-0 bg-transparent pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Search
              </button>
            </form>

            {/* Counts, not claims — each is a live query against the catalogue.
                Orders and businesses are shown only once there are some, so a
                new store never advertises "0+ Orders Fulfilled". */}
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {[
                { label: "Products", value: `${productCount}+` },
                { label: "Categories", value: `${categoryCount}` },
                ...(customerCount > 0
                  ? [{ label: "Businesses Served", value: `${customerCount}+` }]
                  : []),
                ...(orderCount > 0
                  ? [{ label: "Orders Fulfilled", value: `${orderCount}+` }]
                  : []),
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Cloudinary promotional video — autoplay, muted, loop, no controls */}
          <HeroVideo />
        </div>
      </section>

      {/* ── What the store actually offers ─────────────────── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured categories ────────────────────────────── */}
      <section className="container-page py-14 sm:py-16">
        <SectionHeading
          title="Shop by Category"
          description="Everything a salon, parlour, spa or academy orders month after month."
          action={
            <Link href="/categories" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <Image
                  src={c.imageUrl || "/images/categories/placeholder.svg"}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                  {c.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{c._count.products} products</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Wholesale pricing explainer ────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Wholesale pricing that rewards volume
            </h2>
            <p className="mt-4 text-slate-600">
              Every product carries quantity tiers. Increase the quantity and the per-unit price
              drops automatically at checkout — no negotiation, no rate card to chase, no minimum
              order commitment.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                "Tier pricing is calculated on our server, so what you see is what you are charged.",
                "GST number captured at checkout for input credit.",
                "Larger requirement? Raise a bulk enquiry and we will quote you directly.",
              ].map((point) => (
                <li key={point} className="flex gap-2.5">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/products">Browse Wholesale Range</ButtonLink>
              <ButtonLink href="/bulk-orders" variant="outline">
                Request a Bulk Quote
              </ButtonLink>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="relative aspect-[16/7] w-full overflow-hidden">
              <Image
                src="/images/banners/b2b-warehouse-banner-premium.png"
                alt="Shree Gopi Traders B2B Wholesale Warehouse"
                fill
                className="object-cover"
              />
            </div>
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">Example: Professional Shampoo 1L</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Illustrative tiers — actual rates are shown on each product page.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Quantity</th>
                  <th className="px-5 py-2.5 text-right font-medium">Price / unit</th>
                  <th className="px-5 py-2.5 text-right font-medium">You save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { qty: "1 – 4 units", price: 500, save: 0 },
                  { qty: "5 – 9 units", price: 450, save: 10 },
                  { qty: "10+ units", price: 400, save: 20 },
                ].map((row) => (
                  <tr key={row.qty}>
                    <td className="px-5 py-3 text-slate-700">{row.qty}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(row.price, { decimals: false })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.save > 0 ? (
                        <span className="font-medium text-emerald-700">{row.save}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      {/* ── Popular products ───────────────────────────────── */}
      {popular.length > 0 && (
        <section className="container-page py-14 sm:py-16">
          <SectionHeading
            title="Best Sellers"
            description="What salons and parlours reorder most often — order in bulk and save."
            action={
              <Link
                href="/products?sort=popular"
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                View all →
              </Link>
            }
          />
          <ProductGrid products={popular} />
        </section>
      )}

      {/* ── Professional equipment ─────────────────────────── */}
      {equipment.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="container-page py-14 sm:py-16">
            <div className="mb-8 relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-md">
              <Image
                src="/images/banners/spa-equipment-banner-premium.png"
                alt="Luxury Salon Equipment & Furniture Showcase"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-center p-8 sm:p-12">
                <div className="max-w-md text-white">
                  <span className="inline-block rounded-full bg-brand-500/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300 backdrop-blur-md border border-brand-400/30">
                    Commercial Equipment
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl font-bold">
                    Turnkey Furniture &amp; Spa Stations
                  </h3>
                  <p className="mt-2 text-sm text-slate-200 hidden sm:block">
                    Heavy-duty hydraulic chairs, 2-in-1 ozone steamers, and luxury pedicure spa baths built for 5-star parlour setups.
                  </p>
                </div>
              </div>
            </div>
            <SectionHeading
              title="Professional Equipment & Furniture"
              description="Chairs, stations, sterilizers and machines — built for commercial salon use."
              action={
                <Link
                  href="/categories/professional-equipment"
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  View all →
                </Link>
              }
            />
            <ProductGrid products={equipment} />
          </div>
        </section>
      )}

      {/* ── Salon essentials ───────────────────────────────── */}
      {essentials.length > 0 && (
        <section className="container-page py-14 sm:py-16">
          <SectionHeading
            title="Salon Essentials"
            description="Gloves, towels, capes, cotton and hygiene stock — the consumables you reorder every month."
            action={
              <Link
                href="/categories/beauty-consumables"
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                View all →
              </Link>
            }
          />
          <ProductGrid products={essentials} />
        </section>
      )}

      {/* ── Why us ─────────────────────────────────────────── */}
      <section className="container-page py-14 sm:py-16">
        <SectionHeading
          title={`Why ${siteConfig.brandName}`}
          description="Built for the way beauty businesses actually buy."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <benefit.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{benefit.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{benefit.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Newest products ────────────────────────────────── */}
      {newest.length > 0 && (
        <section className="border-t border-slate-200">
          <div className="container-page py-14 sm:py-16">
            <SectionHeading
              title="New Arrivals"
              description="Recently added to the catalogue."
              action={
                <Link
                  href="/products?sort=newest"
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  View all →
                </Link>
              }
            />
            <ProductGrid products={newest} />
          </div>
        </section>
      )}

      {/* ── Reviews ────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="container-page py-14 sm:py-16">
            <SectionHeading title="What Our Customers Say" />
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((review) => (
                <Card key={review.id} className="flex flex-col p-5">
                  <Rating value={review.rating} />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">
                    “{review.comment}”
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-sm font-medium text-slate-900">
                      {review.customer.businessProfile?.businessName ?? review.customer.name}
                    </p>
                    <p className="text-xs text-slate-500">on {review.product.name}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bulk orders ────────────────────────────────────── */}
      <section className="bg-slate-900">
        <div className="container-page flex flex-col items-center gap-5 py-14 text-center sm:py-16">
          <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
            Setting up a new salon, or restocking an entire chain?
          </h2>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Send us your requirement and quantities. Our team will prepare a custom quotation with
            the best possible rates for your order size.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/bulk-orders" size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Request Bulk Quote
            </ButtonLink>
            <ButtonLink
              href="/contact"
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Contact Sales
            </ButtonLink>
          </div>
        </div>
      </section>

      <WhatsAppBanner />
    </>
  );
}
