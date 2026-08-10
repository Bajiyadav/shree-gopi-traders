"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { adminLogoutAction } from "@/actions/auth";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: "orders" as const },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, badge: "lowStock" as const },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/bulk-orders", label: "Bulk Orders", icon: ClipboardList, badge: "bulk" as const },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/trading-history", label: "Trading History", icon: LineChart },
  { href: "/admin/reviews", label: "Reviews", icon: Star, badge: "reviews" as const },
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail, badge: "enquiries" as const },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export interface SidebarCounts {
  orders: number;
  lowStock: number;
  bulk: number;
  reviews: number;
  enquiries: number;
}

export function AdminSidebar({
  adminName,
  counts,
}: {
  adminName: string;
  counts: SidebarCounts;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-brand-700 font-medium text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-300"
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-800 p-3">
      <div className="mb-2 px-3 py-1.5">
        <p className="truncate text-sm font-medium text-white">{adminName}</p>
        <p className="text-xs text-slate-500">Administrator</p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        View Storefront
      </Link>
      <form action={adminLogoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-900">{siteConfig.brandName} Admin</span>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-slate-900 lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-800 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">
            SG
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{siteConfig.brandName}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Admin Panel</p>
          </div>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-4">
              <span className="text-sm font-semibold text-white">Admin Panel</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
