import Image from "next/image";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Boxes,
  Headphones,
  PackageCheck,
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
import { WhatsAppBanner } from "@/components/layout/WhatsApp";
import { formatCurrency } from "@/lib/utils";

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

  // Equipment + furniture get their own rail — these are the high-value
  // considered purchases a salon owner comes back for.
  const equipmentCategories = categories.filter((c) =>
    ["professional-equipment", "salon-furniture", "hair-equipment"].includes(c.slug)
  );
  const equipmentProducts = await prisma.product.findMany({
    where: { isActive: true, categoryId: { in: equipmentCategories.map((c) => c.id) } },
    orderBy: { basePrice: "desc" },
    take: 4,
    select: { id: true },
  });
  const equipment = await hydrateCards(equipmentProducts.map((p) => p.id));

  // Salon essentials — the consumables and hygiene stock that gets reordered
  // month after month, which is what keeps a B2B buyer coming back.
  const essentialCategories = categories.filter((c) =>
    ["beauty-consumables", "cleaning-hygiene"].includes(c.slug)
  );
  const essentialProducts = await prisma.product.findMany({
    where: { isActive: true, categoryId: { in: essentialCategories.map((c) => c.id) } },
    orderBy: { ratingCount: "desc" },
    take: 4,
    select: { id: true },
  });
  const essentials = await hydrateCards(essentialProducts.map((p) => p.id));

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-900">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #14b8a6 0, transparent 45%), radial-gradient(circle at 80% 0%, #0f766e 0, transparent 40%)",
          }}
          aria-hidden="true"
        />
        <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-inset ring-white/20">
              B2B Supply Partner for Beauty Businesses
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {siteConfig.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {siteConfig.supportingText} Order online at wholesale rates, pay cash on delivery,
              and restock your salon without chasing five different suppliers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">
                Shop Products
              </ButtonLink>
              <ButtonLink
                href="/categories"
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50"
              >
                Explore Categories
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {[
                { label: "Products", value: `${productCount}+` },
                { label: "Categories", value: `${categoryCount}` },
                { label: "Businesses Served", value: `${customerCount}+` },
                { label: "Orders Fulfilled", value: `${orderCount}+` },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {categories.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/10"
              >
                <Image
                  src={c.imageUrl || "/images/categories/placeholder.svg"}
                  alt={c.name}
                  fill
                  sizes="(max-width: 1024px) 45vw, 22vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent p-3">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
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
