import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeIndianRupee, FileText, Truck } from "lucide-react";
import { getCurrentCustomerId } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/AuthForms";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Register Your Business",
  description:
    "Create a free business account to buy salon, parlour and spa supplies at wholesale rates with cash on delivery.",
  alternates: { canonical: "/register" },
};

export const dynamic = "force-dynamic";

const PERKS = [
  { icon: BadgeIndianRupee, text: "Automatic wholesale pricing on every product" },
  { icon: Truck, text: "Cash on delivery, free above ₹5,000" },
  { icon: FileText, text: "GST invoices for input credit" },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (await getCurrentCustomerId()) redirect(searchParams.next ?? "/account");

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Register your business</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Takes a minute. No subscription, no minimum order value.
          </p>

          <Card className="mt-6 p-6">
            <RegisterForm next={searchParams.next} />
          </Card>
        </div>

        <aside>
          <Card className="bg-slate-50 p-6">
            <h2 className="text-base font-semibold">Why register?</h2>
            <ul className="mt-4 space-y-4">
              {PERKS.map((perk) => (
                <li key={perk.text} className="flex gap-3 text-sm text-slate-700">
                  <perk.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  {perk.text}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
              We use your business details only for invoicing and delivery.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
