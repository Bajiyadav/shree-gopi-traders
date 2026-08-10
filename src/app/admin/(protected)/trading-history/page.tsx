import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  getTradingHistory, narrate,
  FIXED_MONTHLY_EXPENSES, FIXED_MONTHLY_TOTAL,
  VARIABLE_COST_PER_ORDER, VARIABLE_COST_PER_ITEM, GROSS_MARGIN,
} from "@/lib/trading-history";
import {
  RevenueTrendChart, OrdersTrendChart, ProfitTrendChart,
  CustomerGrowthChart, MonthOverMonthChart, CategoryRevenueChart,
} from "@/components/admin/TradingCharts";
import { StatCard } from "@/components/admin/StatCard";
import { Card, PageHeader } from "@/components/ui";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Trading History" };
export const dynamic = "force-dynamic";

const money = (n: number) => formatCurrency(n, { decimals: false });

export default async function TradingHistoryPage() {
  const h = await getTradingHistory();
  const t = h.totals;
  const analysis = narrate(h);

  const chartData = h.months.map((m) => ({
    month: m.month, netSales: m.netSales, orders: m.orders,
    netProfit: m.netProfit, grossProfit: m.grossProfit,
    customers: m.customers, newCustomers: m.newCustomers, isPartial: m.isPartial,
  }));

  const period = `${h.months[0].month} – ${h.months[h.months.length - 1].month}`;

  /**
   * The footer sums the ROUNDED monthly figures, not the unrounded totals.
   *
   * Each month is displayed to the whole rupee, so adding the printed column
   * can land a rupee or two away from the exact annual figure. An owner
   * checking the column in front of a client would find it did not add up.
   * The underlying values reconcile exactly; this only makes the printed
   * column self-consistent.
   */
  const shown = {
    orders: h.months.reduce((s, m) => s + m.orders, 0),
    netSales: h.months.reduce((s, m) => s + Math.round(m.netSales), 0),
    cogs: h.months.reduce((s, m) => s + Math.round(m.cogs), 0),
    grossProfit: h.months.reduce((s, m) => s + Math.round(m.grossProfit), 0),
    expenses: h.months.reduce((s, m) => s + Math.round(m.expenses), 0),
    netProfit: h.months.reduce((s, m) => s + Math.round(m.netProfit), 0),
    invoices: h.months.reduce((s, m) => s + m.invoices, 0),
  };

  return (
    <>
      <PageHeader
        title="Trading History"
        description={`Twelve months of trading, ${period}. Every figure on this page is read from one dataset.`}
      />

      {!h.reconciles && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-800">
            These totals do not reconcile. Treat the figures below as unreliable
            until this is resolved — do not present them.
          </p>
        </div>
      )}

      {/* ── Headline ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Annual Revenue" value={money(t.netSales)} sublabel={`${period}`} />
        <StatCard label="Orders" value={formatNumber(t.orders)} sublabel={`${t.cancelled} cancelled separately`} />
        <StatCard label="Customers" value={formatNumber(t.customers)} sublabel={`${t.newCustomers} placed a first order`} />
        <StatCard label="Invoices" value={formatNumber(t.invoices)} sublabel="Raised against these orders" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross Profit" value={money(t.grossProfit)} sublabel={`${t.grossMarginPct.toFixed(1)}% of net sales`} />
        <StatCard label="Net Profit" value={money(t.netProfit)} sublabel={`after ${money(t.expenses)} of operating costs`} tone={t.netProfit > 0 ? "success" : "danger"} />
        <StatCard label="Average Order Value" value={money(t.avgOrderValue)} sublabel={`across ${formatNumber(t.orders)} orders`} />
        <StatCard label="Profit Margin" value={`${t.profitMargin.toFixed(1)}%`} sublabel="net profit ÷ net sales" />
      </div>

      {/* ── Where the cost figures come from ─────────────────── */}
      <Card className="mt-5 p-5">
        <h2 className="text-base font-semibold text-slate-900">How cost and profit are worked out</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          This system records what each customer was charged. It does not record what
          the stock cost to buy, so cost of goods and operating costs are{" "}
          <strong className="font-semibold text-slate-800">modelled, not measured</strong>.
          Revenue, orders, customers and invoices below are actual.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-600">Cost of goods</dt>
            <dd className="font-medium text-slate-900">{((1 - GROSS_MARGIN) * 100).toFixed(0)}% of net sales</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-600">Fixed costs a month</dt>
            <dd className="font-medium text-slate-900">{money(FIXED_MONTHLY_TOTAL)}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-600">Per order dispatched</dt>
            <dd className="font-medium text-slate-900">{money(VARIABLE_COST_PER_ORDER)}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-600">Per item packed</dt>
            <dd className="font-medium text-slate-900">{money(VARIABLE_COST_PER_ITEM)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Fixed costs cover {FIXED_MONTHLY_EXPENSES.map((e) => e.label.toLowerCase()).join(", ")}.
        </p>
      </Card>

      {/* ── Charts ───────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <RevenueTrendChart data={chartData} />
        <OrdersTrendChart data={chartData} />
        <ProfitTrendChart data={chartData} />
        <CustomerGrowthChart data={chartData} />
        <MonthOverMonthChart data={chartData} />
        <CategoryRevenueChart data={h.topCategories} />
      </div>

      {/* ── Month by month ───────────────────────────────────── */}
      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900">Month by month</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Sales, cost, profit and invoicing for each of the twelve months.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Month</th>
                <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                <th className="px-4 py-2.5 text-right font-medium">Customers</th>
                <th className="px-4 py-2.5 text-right font-medium">Sales</th>
                <th className="px-4 py-2.5 text-right font-medium">COGS</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross Profit</th>
                <th className="px-4 py-2.5 text-right font-medium">Expenses</th>
                <th className="px-4 py-2.5 text-right font-medium">Net Profit</th>
                <th className="px-4 py-2.5 text-right font-medium">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {h.months.map((m) => (
                <tr key={m.month} className={m.isPartial ? "bg-amber-50/40" : undefined}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                    {m.month}
                    {m.isPartial && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                        in progress
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.orders}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.customers}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{money(m.netSales)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{money(m.cogs)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(m.grossProfit)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{money(m.expenses)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${m.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(m.netProfit)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.invoices}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <tr>
                <td className="px-4 py-3">12-month total</td>
                <td className="px-4 py-3 text-right tabular-nums">{shown.orders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{t.customers}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(shown.netSales)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(shown.cogs)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(shown.grossProfit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(shown.expenses)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{money(shown.netProfit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{shown.invoices}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ── Sales composition ────────────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Sales composition</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {[
              ["Gross sales (at list price)", money(t.grossSales)],
              ["Less wholesale and coupon discounts", `− ${money(t.discounts)}`],
              ["Net sales", money(t.netSales)],
              ["Less cost of goods", `− ${money(t.cogs)}`],
              ["Gross profit", money(t.grossProfit)],
              ["Less operating expenses", `− ${money(t.expenses)}`],
              ["Net profit", money(t.netProfit)],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                className={`flex justify-between py-1.5 ${i === arr.length - 1 || label === "Net sales" || label === "Gross profit" ? "border-t border-slate-200 font-semibold text-slate-900" : "text-slate-600"}`}
              >
                <dt>{label}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Best-selling products</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 text-right font-medium">Units</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {h.topProducts.slice(0, 8).map((p) => (
                <tr key={p.sku}>
                  <td className="py-2 pr-3">
                    <span className="block text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.sku}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-600">{formatNumber(p.units)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatCompactCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Written analysis ─────────────────────────────────── */}
      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-slate-900">Business analysis</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Written from the same figures shown above — nothing here is stated independently.
        </p>
        <dl className="mt-4 space-y-4">
          {Object.entries(analysis).map(([heading, body]) => (
            <div key={heading}>
              <dt className="text-sm font-semibold text-slate-900">{heading}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{body}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Best month", `${h.best.month} · ${money(h.best.netSales)}`],
            ["Weakest month", `${h.worst.month} · ${money(h.worst.netSales)}`],
            ["Average monthly sales", money(t.avgMonthlySales)],
            ["Revenue growth", t.revenueGrowth === null ? "—" : `${t.revenueGrowth > 0 ? "+" : ""}${t.revenueGrowth.toFixed(1)}%`],
            ["Best category", h.topCategories[0] ? `${h.topCategories[0].name} · ${h.topCategories[0].share.toFixed(0)}%` : "—"],
            ["Best product", h.topProducts[0]?.name ?? "—"],
            ["Largest account", h.topCustomer ? `${h.topCustomer.businessName} · ${formatCompactCurrency(h.topCustomer.spent)}` : "—"],
            ["Repeat customers", `${t.repeatCustomerPct.toFixed(0)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/orders" className="font-medium text-brand-700 hover:text-brand-800">
          Order history →
        </Link>
        <Link href="/admin/customers" className="font-medium text-brand-700 hover:text-brand-800">
          Customers →
        </Link>
        <Link href="/admin/analytics" className="font-medium text-brand-700 hover:text-brand-800">
          Analytics →
        </Link>
      </div>
    </>
  );
}
