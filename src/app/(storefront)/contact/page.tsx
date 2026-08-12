import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/PublicForms";
import { Card, PageHeader } from "@/components/ui";
import { WhatsAppButton } from "@/components/layout/WhatsApp";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Sree Gopi Traders for product enquiries, wholesale rate cards, bulk quotes and order support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const rawNum = siteConfig.whatsappNumber.replace(/\D/g, "");
  const whatsappDisplay = rawNum ? `+91 91600 50697` : null;
  const whatsappHref = rawNum ? `https://wa.me/${rawNum}` : "#";

  return (
    <div className="container-page py-8 sm:py-12">
      <PageHeader
        title="Contact Us"
        description="Product questions, rate cards, order support — we are here to help your business."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-6">
          <h2 className="text-base font-semibold">Send us a message</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fill in the form and our team will respond by phone or email.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </Card>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Reach us directly</h2>
            <ul className="mt-4 space-y-4 text-sm">
              {whatsappDisplay && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-slate-900">Phone / WhatsApp (Owner / Admin)</p>
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">
                      {whatsappDisplay}
                    </a>
                  </div>
                </li>
              )}
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-slate-900">Email</p>
                  <p className="text-slate-600">sales@shreegopitraders.com</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-slate-900">Business hours</p>
                  <p className="text-slate-600">Monday – Saturday, 10:00 – 19:00 IST</p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-slate-900">Serving</p>
                  <p className="text-slate-600">Salons, parlours, spas &amp; academies across India</p>
                </div>
              </li>
            </ul>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <WhatsAppButton>Chat on WhatsApp</WhatsAppButton>
            </div>
          </Card>

          <Card className="bg-slate-50 p-5">
            <h2 className="text-sm font-semibold">Looking for bulk pricing?</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Raise a bulk enquiry with your quantities and we will send a custom quotation.
            </p>
            <a
              href="/bulk-orders"
              className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Request a bulk quote →
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
