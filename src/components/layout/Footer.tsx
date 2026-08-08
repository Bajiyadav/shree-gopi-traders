import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { Logo } from "./Logo";
import { WhatsAppButton } from "./WhatsApp";

const SHOP_LINKS = [
  { href: "/products", label: "All Products" },
  { href: "/categories", label: "Categories" },
  { href: "/offers", label: "Offers" },
  { href: "/bulk-orders", label: "Bulk Orders" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/orders", label: "Track Order" },
  { href: "/account", label: "My Account" },
];

export async function Footer() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    take: 8,
    select: { name: true, slug: true },
  });

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="container-page py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              {siteConfig.supportingText}
            </p>
            <div className="mt-5">
              <WhatsAppButton variant="outline">WhatsApp Us</WhatsAppButton>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Shop</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-muted">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="link-muted">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-muted">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Payment</p>
              <p>Cash on Delivery available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.brandName}. All rights reserved.
          </p>
          <p>B2B salon, parlour, spa &amp; beauty supplies · GST invoicing available</p>
        </div>
      </div>
    </footer>
  );
}
