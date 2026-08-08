import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/Sidebar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware verifies the cookie signature; this re-reads the admin row so a
  // revoked account loses access immediately, and gives us the display name.
  const admin = await requireAdmin();

  const [pendingOrders, bulkPending, pendingReviews, unreadEnquiries, lowStock] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.bulkOrderRequest.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { status: "UNREAD" } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Inventory" WHERE stock <= "lowStockThreshold"
    `,
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        adminName={admin.name}
        counts={{
          orders: pendingOrders,
          lowStock: Number(lowStock[0]?.count ?? 0),
          bulk: bulkPending,
          reviews: pendingReviews,
          enquiries: unreadEnquiries,
        }}
      />
      <div className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
