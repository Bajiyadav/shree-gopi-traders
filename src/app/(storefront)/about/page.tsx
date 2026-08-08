import type { Metadata } from "next";
import { BadgeIndianRupee, Boxes, HeartHandshake, ShieldCheck, Truck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { WhatsAppBanner } from "@/components/layout/WhatsApp";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Shree Gopi Traders is a B2B supplier of professional salon, parlour, spa and beauty materials — serving beauty businesses across India with wholesale pricing and cash on delivery.",
  alternates: { canonical: "/about" },
};

export const revalidate = 3600;

const VALUES = [
  {
    icon: Boxes,
    title: "One catalogue, every department",
    body: "Hair, skin, nails, waxing, makeup, furniture, machines and consumables — so you place one order instead of five.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Transparent wholesale pricing",
    body: "Published quantity tiers on every product. No haggling, no hidden rate card, no minimum order value.",
  },
  {
    icon: ShieldCheck,
    title: "Professional-grade stock only",
    body: "We supply salon-strength formulations and commercial equipment rated for daily back-to-back use.",
  },
  {
    icon: Truck,
    title: "Cash on delivery",
    body: "Pay when the stock reaches your salon. Free delivery on orders above ₹5,000.",
  },
  {
    icon: HeartHandshake,
    title: "Built around your business",
    body: "GST invoicing, bulk quotations, and a team that understands how a salon actually runs.",
  },
  {
    icon: Users,
    title: "Trusted by beauty businesses",
    body: "Salons, parlours, spas, barbershops, makeup artists, academies and retailers order with us.",
  },
];

export default async function AboutPage() {
  const [products, categories, customers, orders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.customer.count(),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
  ]);

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-900">
        <div className="container-page py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-inset ring-white/20">
              About {siteConfig.brandName}
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The supply partner behind the salon chair
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              {siteConfig.brandName} is a B2B supply business for the beauty industry. We stock the
              products, tools, equipment and consumables that salons, parlours, spas, barbershops,
              makeup artists and academies get through every single week — and we sell them at
              wholesale rates, online, with cash on delivery.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "Products stocked", value: `${products}+` },
              { label: "Categories", value: `${categories}` },
              { label: "Businesses served", value: `${customers}+` },
              { label: "Orders fulfilled", value: `${orders}+` },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-page py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Why we exist</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                Running a salon means running a small warehouse. Shampoo, colour, wax, gloves,
                towels, gel polish, disinfectant — the list never stops, and it usually comes from
                half a dozen different suppliers with half a dozen different rate cards.
              </p>
              <p>
                We built {siteConfig.brandName} to collapse that into one place. Every product
                carries published quantity tiers, so the price you see is the price you pay when you
                buy at scale. You order online, we deliver, and you pay in cash when it arrives.
              </p>
              <p>
                For larger requirements — a new salon fit-out, a chain restock, an academy batch —
                our bulk quotation flow lets you send the whole list at once and get a custom price
                back.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/products">Browse Catalogue</ButtonLink>
              <ButtonLink href="/bulk-orders" variant="outline">
                Request Bulk Quote
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((value) => (
              <Card key={value.title} className="p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <value.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-3.5 text-sm font-semibold">{value.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{value.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="container-page py-14">
          <PageHeader
            title="Who we supply"
            description="If beauty is your business, this catalogue is built for you."
          />
          <div className="flex flex-wrap gap-2.5">
            {[
              "Salons",
              "Parlours",
              "Spas",
              "Beauty Studios",
              "Barbershops",
              "Makeup Artists",
              "Nail Professionals",
              "Beauty Academies",
              "Retail Beauty Businesses",
            ].map((audience) => (
              <span
                key={audience}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {audience}
              </span>
            ))}
          </div>
        </div>
      </section>

      <WhatsAppBanner />
    </>
  );
}
