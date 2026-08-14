import Link from "next/link";
import {
  CreditCard, Package, PhoneCall, Search, ShoppingCart, Truck, User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCartItemCount } from "@/actions/cart";
import { getCurrentCustomerId } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import { whatsappLink } from "@/lib/utils";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { CategoryDropdown } from "./CategoryDropdown";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/bulk-orders", label: "Bulk Orders" },
  { href: "/products?sort=newest", label: "New Arrivals" },
  { href: "/offers", label: "Offers" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

/**
 * Each of these describes something the store actually does: tiered wholesale
 * pricing, a delivery record per order, and cash on delivery. Nothing here
 * asserts authenticity, price leadership or anything else we cannot evidence.
 */
const UTILITY_ITEMS = [
  { icon: Package, label: "Wholesale & Bulk Orders" },
  { icon: Truck, label: "Pan India Delivery" },
  { icon: CreditCard, label: "Cash on Delivery" },
];

/** +919966335074 → +91 99663 35074 */
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.startsWith("91")) return raw;
  return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
}

export async function Header() {
  const [categories, cartCount, customerId] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
    }),
    getCartItemCount(),
    getCurrentCustomerId(),
  ]);

  const phone = siteConfig.whatsappNumber ? formatPhone(siteConfig.whatsappNumber) : null;
  const waHref = whatsappLink(
    `Hello ${siteConfig.brandName}, I'd like to enquire about your products.`
  );

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* ── Utility bar ───────────────────────────────────────── */}
      <div className="bg-brand-800 text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <ul className="flex items-center gap-5 overflow-hidden">
            {UTILITY_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex shrink-0 items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-4">
            {phone && (
              <a
                href={`tel:+${siteConfig.whatsappNumber}`}
                className="hidden items-center gap-1.5 hover:text-brand-200 sm:flex"
              >
                <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">{phone}</span>
              </a>
            )}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-brand-200"
              >
                <WhatsAppGlyph className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">WhatsApp Us</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Logo · search · account · cart ────────────────────── */}
      <div className="container-page flex h-[72px] items-center gap-3">
        <MobileNav categories={categories} isSignedIn={Boolean(customerId)} />

        <Logo />

        {/* A plain GET form — search needs no client JavaScript. The category
            select posts as `category`, which /products already understands. */}
        <form action="/products" className="mx-auto hidden max-w-2xl flex-1 lg:block">
          <div className="flex h-12 rounded-xl border-2 border-slate-200 bg-white shadow-sm transition-colors focus-within:border-brand-500 focus-within:shadow-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Search products, brands, categories…"
                aria-label="Search products"
                className="h-full w-full rounded-l-xl border-0 bg-transparent pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              name="category"
              aria-label="Search within category"
              defaultValue=""
              className="border-0 border-l border-slate-200 bg-transparent py-0 pl-3 pr-8 text-sm text-slate-600 focus:outline-none focus:ring-0"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Search"
              className="flex w-14 items-center justify-center rounded-r-xl bg-brand-700 text-white transition-colors hover:bg-brand-800"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link
            href="/products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Search products"
          >
            <Search className="h-5 w-5" />
          </Link>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 xl:inline-flex"
            >
              <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
              WhatsApp
            </a>
          )}

          <Link
            href={customerId ? "/account" : "/login"}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <User className="h-5 w-5" />
            <span className="hidden lg:inline">{customerId ? "Account" : "Sign In"}</span>
          </Link>

          <Link
            href="/cart"
            className="relative inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden lg:inline">Cart</span>
            <span
              className={
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold " +
                (cartCount > 0 ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-600")
              }
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>
        </div>
      </div>

      {/* ── Category + section navigation ─────────────────────── */}
      <nav className="hidden border-t border-slate-200 lg:block">
        <div className="container-page flex h-11 items-center gap-1">
          <CategoryDropdown categories={categories} />
          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" />
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

/** The WhatsApp mark. lucide has no brand glyph, and the generic speech
 *  bubble reads as live chat rather than WhatsApp. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Z" />
    </svg>
  );
}
