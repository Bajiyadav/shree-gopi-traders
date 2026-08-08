"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface NavCategory {
  name: string;
  slug: string;
}

export function MobileNav({
  categories,
  isSignedIn,
}: {
  categories: NavCategory[];
  isSignedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Any navigation closes the drawer.
  useEffect(() => setOpen(false), [pathname]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4">
              <ul className="space-y-1">
                {[
                  { href: "/products", label: "Shop All Products" },
                  { href: "/categories", label: "Categories" },
                  { href: "/offers", label: "Offers" },
                  { href: "/bulk-orders", label: "Bulk Orders" },
                  { href: "/about", label: "About Us" },
                  { href: "/contact", label: "Contact" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Shop by Category
              </p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/categories/${c.slug}`}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-slate-200 p-4">
              {isSignedIn ? (
                <Link
                  href="/account"
                  className="block rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white"
                >
                  My Account
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
