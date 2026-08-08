import type { Metadata } from "next";
import { ClipboardList, FileSpreadsheet, HandCoins, Timer } from "lucide-react";
import { getCurrentCustomer } from "@/lib/auth";
import { BulkOrderForm } from "@/components/forms/PublicForms";
import { Card, PageHeader } from "@/components/ui";
import { WhatsAppButton } from "@/components/layout/WhatsApp";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Bulk Orders & Wholesale Quotes",
  description:
    "Request a custom wholesale quotation for bulk salon, parlour and spa supplies — new salon setups, chain restocking and academy requirements.",
  alternates: { canonical: "/bulk-orders" },
};

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: ClipboardList, title: "Send your requirement", body: "List the products and quantities you need." },
  { icon: FileSpreadsheet, title: "We prepare a quote", body: "Our team reviews stock and prices your order." },
  { icon: HandCoins, title: "Approve and order", body: "Accept the quote and we convert it to an order." },
  { icon: Timer, title: "Dispatch", body: "Bulk consignments dispatched on a scheduled date." },
];

export default async function BulkOrdersPage() {
  const customer = await getCurrentCustomer();

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-900">
        <div className="container-page py-14 sm:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-inset ring-white/20">
              Wholesale &amp; Bulk Procurement
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Bulk orders, quoted for your business
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Opening a new salon, running a chain, or stocking an academy? Send us your
              requirement and we will come back with a custom rate — better than the listed
              wholesale tiers on large quantities.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Step {i + 1}
                </span>
              </div>
              <h2 className="mt-3.5 text-sm font-semibold text-slate-900">{step.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] sm:py-14">
          <div>
            <PageHeader
              title="Request a bulk quote"
              description="Tell us what you need. We usually respond within one working day."
            />
            <Card className="p-6">
              <BulkOrderForm
                defaults={{
                  companyName: customer?.businessProfile?.businessName ?? undefined,
                  contactPerson: customer?.name,
                  phone: customer?.phone,
                  email: customer?.email,
                }}
              />
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="p-5">
              <h2 className="text-base font-semibold">Prefer to talk?</h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Send your list on WhatsApp and we will quote directly in chat.
              </p>
              <div className="mt-4">
                <WhatsAppButton
                  message={`Hello ${siteConfig.brandName}, I'd like a bulk quote. My requirement is:`}
                >
                  Send on WhatsApp
                </WhatsAppButton>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Typical bulk requirements</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  "Complete new salon or parlour setup",
                  "Monthly consumables for multi-chair salons",
                  "Academy kits for student batches",
                  "Furniture and equipment fit-outs",
                  "Chain-wide restocking across branches",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
