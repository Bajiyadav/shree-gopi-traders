import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hydrateCards } from "@/lib/catalog";
import { ProductGrid } from "@/components/products/ProductCard";
import { ButtonLink, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offers & Coupons",
  description:
    "Current discounts, coupon codes and marked-down professional salon supplies at Sree Gopi Traders.",
  alternates: { canonical: "/offers" },
};

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const now = new Date();

  const [coupons, discountedProducts] = await Promise.all([
    prisma.coupon.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { discountValue: "desc" },
    }),
    // Products where at least one active variant is marked down.
    prisma.product.findMany({
      where: { isActive: true, variants: { some: { isActive: true, salePrice: { not: null } } } },
      select: { id: true },
      take: 24,
    }),
  ]);

  const availableCoupons = coupons.filter(
    (c) => c.usageLimit === null || c.usageCount < c.usageLimit
  );
  const cards = await hydrateCards(discountedProducts.map((p) => p.id));

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Offers & Coupons"
        description="Live discounts you can apply at checkout, plus everything currently marked down."
      />

      <section className="mb-12">
        <SectionHeading title="Coupon Codes" description="Apply these in your cart before checkout." />

        {availableCoupons.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-8 w-8" />}
            title="No active coupons right now"
            description="Wholesale tier pricing still applies automatically on every product."
            action={<ButtonLink href="/products">Shop Products</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableCoupons.map((coupon) => (
              <Card key={coupon.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 bg-brand-700 px-5 py-3">
                  <span className="font-mono text-base font-semibold tracking-wider text-white">
                    {coupon.code}
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${Number(coupon.discountValue)}% off`
                      : `${formatCurrency(Number(coupon.discountValue), { decimals: false })} off`}
                  </span>
                </div>
                <div className="space-y-1.5 p-5 text-sm text-slate-600">
                  {coupon.minOrderValue && (
                    <p>
                      Minimum order{" "}
                      <span className="font-medium text-slate-900">
                        {formatCurrency(Number(coupon.minOrderValue), { decimals: false })}
                      </span>
                    </p>
                  )}
                  {coupon.maxDiscount && (
                    <p>
                      Maximum discount{" "}
                      <span className="font-medium text-slate-900">
                        {formatCurrency(Number(coupon.maxDiscount), { decimals: false })}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Valid until {formatDate(coupon.endDate)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          title="Products on Discount"
          description="Marked-down items — wholesale tiers still stack on top of quantity."
        />
        {cards.length === 0 ? (
          <EmptyState
            title="No discounted products at the moment"
            description="Browse the full catalogue — quantity-based wholesale pricing applies to every product."
            action={<ButtonLink href="/products">Shop All Products</ButtonLink>}
          />
        ) : (
          <ProductGrid products={cards} />
        )}
      </section>
    </div>
  );
}
