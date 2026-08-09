import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getDashboardSummary,
  getInventorySummary,
  getMonthlyRevenueAndOrders,
  getTopCategories,
  getTopProducts,
} from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/StatCard";
import { MonthlyTable, OrdersChart, RevenueChart } from "@/components/admin/Charts";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const since12mo = new Date();
  since12mo.setMonth(since12mo.getMonth() - 12);

  const [summary, monthly, topProducts, topCategories, recentOrders, lowStock, bulkRequests, inventory] =
    await Promise.all([
      getDashboardSummary(),
      getMonthlyRevenueAndOrders(),
      getTopProducts(since12mo, 5),
      getTopCategories(since12mo, 5),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          customer: { select: { name: true, businessProfile: { select: { businessName: true } } } },
        },
      }),
      prisma.inventory.findMany({
        where: { stock: { lte: 10 } },
        orderBy: { stock: "asc" },
        take: 6,
        include: {
          productVariant: {
            select: { name: true, sku: true, product: { select: { name: true } } },
          },
        },
      }),
      prisma.bulkOrderRequest.findMany({
        where: { status: { in: ["PENDING", "REVIEWING"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      getInventorySummary(),
    ]);

  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);
  const maxCategoryRevenue = Math.max(...topCategories.map((c) => c.revenue), 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live figures computed from the database — nothing here is cached or hardcoded."
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(summary.todayRevenue, { decimals: false })}
          sublabel={`${summary.todayOrders} order${summary.todayOrders === 1 ? "" : "s"} today`}
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(summary.monthRevenue, { decimals: false })}
          sublabel={`${summary.monthOrders} orders this month`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Last 12 Months"
          value={formatCompactCurrency(summary.last12MoRevenue)}
          sublabel={`${formatNumber(summary.last12MoOrders)} orders`}
          icon={ShoppingBag}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(summary.avgOrderValue, { decimals: false })}
          sublabel="Across the last 12 months"
          icon={IndianRupee}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={formatNumber(summary.totalOrders)}
          sublabel={`${summary.deliveredOrders} delivered · ${summary.cancelledOrders} cancelled`}
          icon={ShoppingBag}
          href="/admin/orders"
        />
        <StatCard
          label="Pending Orders"
          value={formatNumber(summary.pendingOrders)}
          sublabel="Awaiting confirmation"
          icon={ClipboardList}
          tone={summary.pendingOrders > 0 ? "warning" : "default"}
          href="/admin/orders?status=PENDING"
        />
        <StatCard
          label="Total Customers"
          value={formatNumber(summary.totalCustomers)}
          sublabel={`${summary.newCustomers} new this month`}
          icon={Users}
          href="/admin/customers"
        />
        <StatCard
          label="Low Stock"
          value={formatNumber(summary.lowStockCount)}
          sublabel={`${summary.outOfStockCount} out of stock`}
          icon={AlertTriangle}
          tone={summary.lowStockCount > 0 ? "danger" : "success"}
          href="/admin/inventory?filter=low"
        />
      </div>

      {/* For a trading business most of the working capital sits on the racks,
          and nothing on this page said how much. */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Stock on Hand"
          value={formatCompactCurrency(inventory.value)}
          sublabel={`${formatNumber(inventory.units)} units across ${formatNumber(inventory.skus)} SKUs`}
          icon={Boxes}
          href="/admin/inventory"
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Stock is valued at the single-unit selling rate — the only price this system
        holds. It is not a cost valuation and should not be used as a closing-stock
        figure for accounts.
      </p>

      {/* Charts */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Revenue — last 12 months</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Rolling window ending this month. Cancelled orders excluded.
          </p>
          <div className="mt-4">
            <RevenueChart data={monthly} />
          </div>
          <MonthlyTable data={monthly} />
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Orders — last 12 months</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Delivered versus cancelled orders per month.
          </p>
          <div className="mt-4">
            <OrdersChart data={monthly} />
          </div>
          <MonthlyTable data={monthly} />
        </Card>
      </div>

      {/* Top products / categories */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Top Products (12 months)</h2>
            <Link href="/admin/analytics" className="text-sm font-medium text-brand-700">
              Analytics →
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sales recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topProducts.map((p) => (
                <li key={p.productId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{p.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900">
                      {formatCurrency(p.revenue, { decimals: false })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.max(3, (p.revenue / maxProductRevenue) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {formatNumber(p.unitsSold)} units
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Top Categories (12 months)</h2>
          {topCategories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sales recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topCategories.map((c) => (
                <li key={c.categoryId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{c.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900">
                      {formatCurrency(c.revenue, { decimals: false })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.max(3, (c.revenue / maxCategoryRevenue) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {c.orderCount} orders
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-brand-700">
            View all →
          </Link>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order</th>
                <th className="px-5 py-2.5 text-left font-medium">Business</th>
                <th className="px-5 py-2.5 text-left font-medium">Date</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
                <th className="px-5 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {order.businessName ??
                      order.customer.businessProfile?.businessName ??
                      order.customer.name}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(Number(order.total), { decimals: false })}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Low stock + bulk requests */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold">Low Stock Alerts</h2>
            <Link href="/admin/inventory" className="text-sm font-medium text-brand-700">
              Manage →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="p-5">
              <EmptyState title="All stock levels healthy" icon={<Package className="h-7 w-7" />} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {inv.productVariant.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {inv.productVariant.name} · {inv.productVariant.sku}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      inv.stock === 0
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {inv.stock === 0 ? "Out of stock" : `${inv.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold">Open Bulk Requests</h2>
            <Link href="/admin/bulk-orders" className="text-sm font-medium text-brand-700">
              Manage →
            </Link>
          </div>
          {bulkRequests.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No open bulk requests"
                icon={<ClipboardList className="h-7 w-7" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {bulkRequests.map((req) => (
                <li key={req.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/bulk-orders/${req.id}`}
                        className="truncate text-sm font-medium text-slate-900 hover:text-brand-700"
                      >
                        {req.companyName}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {req.productsNote}
                      </p>
                    </div>
                    <StatusBadge status={req.status} kind="bulk" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
