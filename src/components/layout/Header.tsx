import Link from "next/link";
import { Search, ShoppingCart, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCartItemCount } from "@/actions/cart";
import { getCurrentCustomerId } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { CategoryDropdown } from "./CategoryDropdown";

const NAV_LINKS = [
  { href: "/products", label: "Shop" },
  { href: "/bulk-orders", label: "Bulk Orders" },
  { href: "/offers", label: "Offers" },
];

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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="bg-slate-900 text-white">
        <div className="container-page flex h-9 items-center justify-center text-center text-xs sm:justify-between">
          <p className="truncate">{siteConfig.announcementBar}</p>
          <p className="hidden sm:block">
            Cash on Delivery · Wholesale rates on every product
          </p>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3">
        <MobileNav
          categories={categories}
          isSignedIn={Boolean(customerId)}
        />

        <Logo />

        <nav className="ml-4 hidden items-center lg:flex">
          <CategoryDropdown categories={categories} />
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* A plain GET form — search needs no client JavaScript. */}
        <form action="/products" className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              placeholder="Search products, brands or SKU…"
              aria-label="Search products"
              className="input-base pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link
            href="/products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Search products"
          >
            <Search className="h-5 w-5" />
          </Link>

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
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
