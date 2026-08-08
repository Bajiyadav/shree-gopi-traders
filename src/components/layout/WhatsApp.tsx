import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { cn, whatsappLink } from "@/lib/utils";

/**
 * WhatsApp is how most Indian B2B buyers actually reach a supplier, so the
 * CTA is reused across the storefront. Renders nothing when
 * NEXT_PUBLIC_WHATSAPP_NUMBER is unset — no dead links in production.
 */
export function WhatsAppButton({
  message,
  children,
  className,
  variant = "solid",
}: {
  message?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "solid" | "outline";
}) {
  const href = whatsappLink(message ?? `Hello ${siteConfig.brandName}, I'd like to enquire about your products.`);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
        variant === "solid"
          ? "bg-[#25D366] text-white hover:bg-[#1eb455]"
          : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {children ?? "Chat on WhatsApp"}
    </a>
  );
}

/** Persistent floating action button on the storefront. */
export function FloatingWhatsApp() {
  const href = whatsappLink(`Hello ${siteConfig.brandName}, I'd like to place an order.`);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}

/** Full-width band used on the homepage and product pages. */
export function WhatsAppBanner() {
  const href = whatsappLink();
  if (!href) return null;

  return (
    <section className="bg-brand-700">
      <div className="container-page flex flex-col items-center gap-5 py-12 text-center sm:py-14">
        <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
          Need help choosing the right products for your salon?
        </h2>
        <p className="max-w-xl text-sm text-brand-50 sm:text-base">
          Message our team on WhatsApp for product advice, wholesale rate cards and bulk quotes.
        </p>
        <WhatsAppButton className="bg-white text-brand-800 hover:bg-brand-50">
          Talk to Our Team
        </WhatsAppButton>
      </div>
    </section>
  );
}
