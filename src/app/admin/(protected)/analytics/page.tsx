import type { Metadata } from "next";
import Link from "next/link";
import { IndianRupee, ShoppingBag, Users } from "lucide-react";
import {
  getCustomerAnalytics,
  getMonthlyRevenueAndOrders,
  getOrderStatusBreakdown,
  getTopCategories,
  getTopProducts,
  getWindowSummary,
  resolveAnalyticsWindow,
} from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { MonthlyTable, OrdersChart, RevenueChart } from "@/components/admin/Charts";
import { StatCard } from "@/components/admin/StatCard";
import { Card, PageHeader } from "@/components/ui";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber, humanize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const WINDOWS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
] as const;

type WindowValue = (typeof WINDOWS)[number]["value"];

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = (WINDOWS.some((w) => w.value === searchParams.range)
    ? searchParams.range
    : "30d") as WindowValue;
  const since = resolveAnalyticsWindow(range);
  const rangeLabel = WINDOWS.find((w) => w.value === range)!.label;

  const [
    windowSummary,
    monthly,
    topProducts,
    topCategories,
    customerStats,
    statusBreakdown,
    inventoryStats,
    productCount,
  ] = await Promise.all([
    getWindowSummary(since),
    // The 12-month series is always the rolling window ending this month —
    // it is deliberately independent of the range filter above.
    getMonthlyRevenueAndOrders(),
    getTopProducts(since, 10),
    getTopCategories(since, 10),
    getCustomerAnalytics(since),
    getOrderStatusBreakdown(since),
    prisma.$queryRaw<{ low: bigint; out: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE stock <= "lowStockThreshold" AND stock > 0)::bigint AS low,
             COUNT(*) FILTER (WHERE stock <= 0)::bigint AS out
      FROM "Inventory"
    `,
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const statusMap = new Map(statusBreakdown.map((s) => [s.status, s.count]));
  const statusTotal = statusBreakdown.reduce((sum, s) => sum + s.count, 0);
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);
  const maxCategoryRevenue = Math.max(...topCategories.map((c) => c.revenue), 1);
  const inventory = inventoryStats[0];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every number below is computed live from PostgreSQL. Cancelled orders never count as revenue."
      />

      {/* One filter row scoping everything below except the rolling 12-month charts. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        {WINDOWS.map((w) => (
          <Link
            key={w.value}
            href={`/admin/analytics?range=${w.value}`}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              range === w.value
                ? "bg-brand-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {w.label}
          </Link>
        ))}
        <span className="ml-2 text-xs text-slate-500">since {formatDate(since)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Revenue (${rangeLabel})`}
          value={formatCompactCurrency(windowSummary.revenue)}
          sublabel={`${windowSummary.earningOrders} earning orders`}
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label={`Orders (${rangeLabel})`}
          value={formatNumber(windowSummary.orders)}
          sublabel={`${windowSummary.delivered} delivered · ${windowSummary.cancelled} cancelled`}
          icon={ShoppingBag}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(windowSummary.avgOrderValue, { decimals: false })}
          sublabel="Cancelled orders excluded"
        />
        <StatCard
          label="Buying Customers"
          value={formatNumber(windowSummary.uniqueCustomers)}
          sublabel={`${customerStats.newCustomers} new · ${customerStats.returningCustomers} returning`}
          icon={Users}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Products" value={formatNumber(productCount)} />
        <StatCard
          label="Low Stock"
          value={formatNumber(Number(inventory?.low ?? 0))}
          tone={Number(inventory?.low ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Out of Stock"
          value={formatNumber(Number(inventory?.out ?? 0))}
          tone={Number(inventory?.out ?? 0) > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Avg Customer Spend"
          value={formatCurrency(customerStats.avgSpend, { decimals: false })}
          sublabel={`Over the last ${rangeLabel.toLowerCase()}`}
        />
      </div>

      {/* Rolling 12-month charts */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Revenue — rolling 12 months</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Recomputed from today&rsquo;s date on every load — the window always ends this month.
          </p>
          <div className="mt-4">
            <RevenueChart data={monthly} />
          </div>
          <MonthlyTable data={monthly} />
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Orders — rolling 12 months</h2>
          <p className="mt-0.5 text-sm text-slate-500">Delivered versus cancelled, per month.</p>
          <div className="mt-4">
            <OrdersChart data={monthly} />
          </div>
          <MonthlyTable data={monthly} />
        </Card>
      </div>

      {/* Status breakdown — 8 classes, so a table with magnitude bars rather than 8 hues. */}
      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold">Order Status Breakdown ({rangeLabel})</h2>
        <div className="table-scroll mt-4">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Share</th>
                <th className="w-2/5 py-2 text-left font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {STATUS_ORDER.map((status) => {
                const count = statusMap.get(status as never) ?? 0;
                const share = statusTotal ? (count / statusTotal) * 100 : 0;
                return (
                  <tr key={status}>
                    <td className="py-2.5 text-slate-700">{humanize(status)}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                      {formatNumber(count)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">
                      {share.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            status === "CANCELLED" ? "bg-red-500" : "bg-brand-600"
                          )}
                          style={{ width: `${Math.max(share, count > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top products / categories / customers */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Top Products ({rangeLabel})</h2>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sales in this period.</p>
          ) : (
            <div className="table-scroll mt-4">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 text-left font-medium">Product</th>
                    <th className="py-2 text-right font-medium">Units</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="py-2.5">
                        <p className="text-slate-700">{p.name}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${Math.max(3, (p.revenue / maxProductRevenue) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">
                        {formatNumber(p.unitsSold)}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(p.revenue, { decimals: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Top Categories ({rangeLabel})</h2>
          {topCategories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sales in this period.</p>
          ) : (
            <div className="table-scroll mt-4">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 text-left font-medium">Category</th>
                    <th className="py-2 text-right font-medium">Units</th>
                    <th className="py-2 text-right font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCategories.map((c) => (
                    <tr key={c.categoryId}>
                      <td className="py-2.5">
                        <p className="text-slate-700">{c.name}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{
                              width: `${Math.max(3, (c.revenue / maxCategoryRevenue) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">
                        {formatNumber(c.unitsSold)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">
                        {c.orderCount}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(c.revenue, { decimals: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold">Top Customers ({rangeLabel})</h2>
        {customerStats.topCustomers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No customers ordered in this period.</p>
        ) : (
          <div className="table-scroll mt-4">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 text-left font-medium">Business</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Total Spent</th>
                  <th className="py-2 text-left font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerStats.topCustomers.map((c) => (
                  <tr key={c.customerId}>
                    <td className="py-2.5">
                      <Link
                        href={`/admin/customers/${c.customerId}`}
                        className="text-slate-900 hover:text-brand-700"
                      >
                        {c.businessName}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">{c.orders}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(c.totalSpent, { decimals: false })}
                    </td>
                    <td className="py-2.5 text-slate-500">{formatDate(c.lastOrder)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
