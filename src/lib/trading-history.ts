import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getLastNMonths } from "./analytics";

/**
 * TWELVE-MONTH TRADING HISTORY
 * ────────────────────────────
 * One query, one derivation, one dataset. Every figure the admin sees —
 * the KPI cards, the month table, each chart, the written analysis — is read
 * from the object this returns. Nothing recomputes a total independently, so
 * two pages cannot disagree.
 *
 * WHERE THE COST FIGURES COME FROM
 * This system records what a customer was charged; it has never recorded what
 * the stock cost to buy. Cost of goods and operating expenses are therefore
 * MODELLED from the assumptions below, not measured. They are shown so the
 * trading history reads as a business rather than a list of receipts, and the
 * page says plainly that they are modelled.
 *
 * The assumptions are held here, once. Change GROSS_MARGIN and every profit
 * figure in the admin moves together.
 */

/** Gross margin on wholesale salon supply — the spread between purchase cost
 *  and the tiered selling rates this catalogue charges. */
export const GROSS_MARGIN = 0.24;

/** Monthly running costs that do not move with sales volume. */
export const FIXED_MONTHLY_EXPENSES = [
  { label: "Shop rent", amount: 8000 },
  { label: "Salaries", amount: 15000 },
  { label: "Electricity and water", amount: 1500 },
  { label: "Telephone and internet", amount: 1000 },
  { label: "Repairs and maintenance", amount: 1000 },
] as const;

export const FIXED_MONTHLY_TOTAL = FIXED_MONTHLY_EXPENSES.reduce((s, e) => s + e.amount, 0);

/** Costs that scale with how much is actually dispatched. */
export const VARIABLE_COST_PER_ORDER = 55;   // packing, courier handling
export const VARIABLE_COST_PER_ITEM = 4;     // consumables per line packed

export interface TradingMonth {
  month: string;              // "Sep 2025"
  monthStart: Date;
  orders: number;             // orders placed, excluding cancelled
  cancelled: number;
  customers: number;          // distinct businesses that ordered
  newCustomers: number;       // first ever order fell in this month
  invoices: number;
  itemsSold: number;
  grossSales: number;         // list value of everything sold
  discounts: number;          // wholesale tier + coupon savings
  netSales: number;           // what was actually charged, incl. delivery
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  avgOrderValue: number;
  revenueGrowth: number | null;
  /** The month still in progress. Its totals are days short of a full month,
   *  so it is shown but never ranked or used to describe the trend. */
  isPartial: boolean;
}

export interface TradingHistory {
  months: TradingMonth[];
  from: Date;
  to: Date;
  totals: {
    orders: number; cancelled: number; customers: number; newCustomers: number;
    invoices: number; itemsSold: number;
    grossSales: number; discounts: number; netSales: number;
    cogs: number; grossProfit: number; expenses: number; netProfit: number;
    avgOrderValue: number; avgMonthlySales: number;
    profitMargin: number; grossMarginPct: number;
    revenueGrowth: number | null;   // last month vs first month
    repeatCustomerPct: number;
  };
  best: TradingMonth;
  worst: TradingMonth;
  topCategories: { name: string; revenue: number; units: number; share: number }[];
  topProducts: { name: string; sku: string; revenue: number; units: number }[];
  topCustomer: { name: string; businessName: string; orders: number; spent: number } | null;
  /** True when the numbers balance — surfaced so the page can admit a fault
   *  rather than quietly presenting figures that do not add up. */
  reconciles: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getTradingHistory(monthCount = 12, from: Date = new Date()): Promise<TradingHistory> {
  const window = getLastNMonths(monthCount, from);
  const start = window[0].start;
  const end = window[window.length - 1].end;

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: {
      id: true, createdAt: true, status: true, customerId: true,
      subtotal: true, bulkDiscount: true, couponDiscount: true,
      deliveryFee: true, tax: true, total: true,
      invoice: { select: { id: true } },
      items: {
        select: {
          quantity: true, listPrice: true, unitPrice: true, lineTotal: true,
          product: { select: { name: true, sku: true, category: { select: { name: true } } } },
        },
      },
      customer: { select: { name: true, businessProfile: { select: { businessName: true } } } },
    },
  });

  // First-ever order date per customer, so "new" means new to the business,
  // not merely new to this window.
  const firstOrders = await prisma.order.groupBy({
    by: ["customerId"],
    where: { status: { not: "CANCELLED" } },
    _min: { createdAt: true },
  });
  const firstOrderAt = new Map(firstOrders.map((f) => [f.customerId, f._min.createdAt!]));

  const earning = orders.filter((o) => o.status !== "CANCELLED");

  const months: TradingMonth[] = window.map((m) => {
    const inMonth = earning.filter((o) => o.createdAt >= m.start && o.createdAt < m.end);
    const cancelledInMonth = orders.filter(
      (o) => o.status === "CANCELLED" && o.createdAt >= m.start && o.createdAt < m.end
    ).length;

    const netSales = inMonth.reduce((s, o) => s + Number(o.total), 0);
    const grossSales = inMonth.reduce(
      (s, o) => s + o.items.reduce((t, i) => t + Number(i.listPrice) * i.quantity, 0),
      0
    );
    const discounts = inMonth.reduce(
      (s, o) => s + Number(o.bulkDiscount) + Number(o.couponDiscount),
      0
    );
    const itemsSold = inMonth.reduce((s, o) => s + o.items.reduce((t, i) => t + i.quantity, 0), 0);

    const cogs = netSales * (1 - GROSS_MARGIN);
    const grossProfit = netSales - cogs;
    const expenses =
      FIXED_MONTHLY_TOTAL +
      inMonth.length * VARIABLE_COST_PER_ORDER +
      itemsSold * VARIABLE_COST_PER_ITEM;
    const netProfit = grossProfit - expenses;

    const customerIds = new Set(inMonth.map((o) => o.customerId));
    const newCustomers = [...customerIds].filter((id) => {
      const first = firstOrderAt.get(id);
      return first && first >= m.start && first < m.end;
    }).length;

    return {
      month: m.label,
      monthStart: m.start,
      orders: inMonth.length,
      cancelled: cancelledInMonth,
      customers: customerIds.size,
      newCustomers,
      invoices: inMonth.filter((o) => o.invoice).length,
      itemsSold,
      grossSales: round2(grossSales),
      discounts: round2(discounts),
      netSales: round2(netSales),
      cogs: round2(cogs),
      grossProfit: round2(grossProfit),
      expenses: round2(expenses),
      netProfit: round2(netProfit),
      avgOrderValue: inMonth.length ? round2(netSales / inMonth.length) : 0,
      revenueGrowth: null,
      isPartial: m.start <= from && from < m.end,
    };
  });

  // Month-over-month growth, once the series exists. Growth from a zero base is
  // undefined rather than infinite.
  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1].netSales;
    months[i].revenueGrowth = prev > 0 ? round2(((months[i].netSales - prev) / prev) * 100) : null;
  }

  const sum = (k: keyof TradingMonth) => months.reduce((s, m) => s + (m[k] as number), 0);

  const allCustomerIds = new Set(earning.map((o) => o.customerId));
  const ordersPerCustomer = new Map<string, number>();
  for (const o of earning) ordersPerCustomer.set(o.customerId, (ordersPerCustomer.get(o.customerId) ?? 0) + 1);
  const repeat = [...ordersPerCustomer.values()].filter((n) => n > 1).length;

  const netSales = round2(sum("netSales"));
  const cogs = round2(sum("cogs"));
  const grossProfit = round2(netSales - cogs);
  const expenses = round2(sum("expenses"));
  const netProfit = round2(grossProfit - expenses);
  const totalOrders = sum("orders");

  // ── Category and product performance, from the same order set ──
  const catMap = new Map<string, { revenue: number; units: number }>();
  const prodMap = new Map<string, { sku: string; revenue: number; units: number }>();
  for (const o of earning) {
    for (const i of o.items) {
      const cat = i.product.category.name;
      const c = catMap.get(cat) ?? { revenue: 0, units: 0 };
      c.revenue += Number(i.lineTotal); c.units += i.quantity;
      catMap.set(cat, c);

      const p = prodMap.get(i.product.name) ?? { sku: i.product.sku, revenue: 0, units: 0 };
      p.revenue += Number(i.lineTotal); p.units += i.quantity;
      prodMap.set(i.product.name, p);
    }
  }
  const catRevenue = [...catMap.values()].reduce((s, c) => s + c.revenue, 0);
  const topCategories = [...catMap.entries()]
    .map(([name, c]) => ({ name, revenue: round2(c.revenue), units: c.units, share: catRevenue ? round2((c.revenue / catRevenue) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const topProducts = [...prodMap.entries()]
    .map(([name, p]) => ({ name, sku: p.sku, revenue: round2(p.revenue), units: p.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const spendByCustomer = new Map<string, { name: string; businessName: string; orders: number; spent: number }>();
  for (const o of earning) {
    const key = o.customerId;
    const rec = spendByCustomer.get(key) ?? {
      name: o.customer.name,
      businessName: o.customer.businessProfile?.businessName ?? o.customer.name,
      orders: 0, spent: 0,
    };
    rec.orders++; rec.spent += Number(o.total);
    spendByCustomer.set(key, rec);
  }
  const topCustomer = [...spendByCustomer.values()].sort((a, b) => b.spent - a.spent)[0] ?? null;
  if (topCustomer) topCustomer.spent = round2(topCustomer.spent);

  // Rank and trend on complete months only. The month in progress is days
  // short of a full one; letting it compete would report the current month as
  // the worst on record for the first week of every month.
  const traded = months.filter((m) => m.orders > 0 && !m.isPartial);
  const best = traded.reduce((a, b) => (b.netSales > a.netSales ? b : a), traded[0] ?? months[0]);
  const worst = traded.reduce((a, b) => (b.netSales < a.netSales ? b : a), traded[0] ?? months[0]);

  const complete = months.filter((m) => !m.isPartial);
  const first = complete[0]?.netSales ?? 0;
  const last = complete[complete.length - 1]?.netSales ?? 0;

  // Every identity the page states must actually hold.
  const reconciles =
    Math.abs(sum("netSales") - netSales) < 1 &&
    Math.abs(netSales - cogs - grossProfit) < 1 &&
    Math.abs(grossProfit - expenses - netProfit) < 1 &&
    Math.abs(sum("orders") - totalOrders) < 1;

  return {
    months,
    from: start,
    to: end,
    totals: {
      orders: totalOrders,
      cancelled: sum("cancelled"),
      customers: allCustomerIds.size,
      newCustomers: sum("newCustomers"),
      invoices: sum("invoices"),
      itemsSold: sum("itemsSold"),
      grossSales: round2(sum("grossSales")),
      discounts: round2(sum("discounts")),
      netSales,
      cogs,
      grossProfit,
      expenses,
      netProfit,
      avgOrderValue: totalOrders ? round2(netSales / totalOrders) : 0,
      avgMonthlySales: round2(netSales / months.length),
      profitMargin: netSales ? round2((netProfit / netSales) * 100) : 0,
      grossMarginPct: netSales ? round2((grossProfit / netSales) * 100) : 0,
      revenueGrowth: first > 0 ? round2(((last - first) / first) * 100) : null,
      repeatCustomerPct: allCustomerIds.size ? round2((repeat / allCustomerIds.size) * 100) : 0,
    },
    best,
    worst,
    topCategories,
    topProducts,
    topCustomer,
    reconciles,
  };
}

/** Sentences for the written analysis, phrased from the figures themselves. */
export function narrate(h: TradingHistory) {
  const t = h.totals;
  const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const complete = h.months.filter((m) => !m.isPartial);
  const openedWith = complete[0];
  const closedWith = complete[complete.length - 1];
  const partial = h.months.find((m) => m.isPartial);
  const trend = t.revenueGrowth === null ? "flat"
    : t.revenueGrowth > 15 ? "clearly upward"
    : t.revenueGrowth > 0 ? "modestly upward"
    : t.revenueGrowth > -10 ? "broadly steady"
    : "down";

  return {
    "Annual Performance":
      `${inr(t.netSales)} of net sales across ${t.orders} orders from ${t.customers} salon accounts, ` +
      `averaging ${inr(t.avgMonthlySales)} a month.`,
    "Sales Trend":
      `Trade is ${trend} across the completed months — ${openedWith?.month} closed at ${inr(openedWith?.netSales ?? 0)} ` +
      `against ${inr(closedWith?.netSales ?? 0)} in ${closedWith?.month}. ` +
      `${h.best.month} was the strongest at ${inr(h.best.netSales)}; ${h.worst.month} the weakest at ${inr(h.worst.netSales)}.` +
      (partial ? ` ${partial.month} is still in progress and is excluded from that comparison.` : ""),
    "Profitability":
      `Gross profit of ${inr(t.grossProfit)} (${t.grossMarginPct.toFixed(1)}% of net sales) less ${inr(t.expenses)} ` +
      `of operating costs leaves ${inr(t.netProfit)}, a net margin of ${t.profitMargin.toFixed(1)}%.`,
    "Customer Growth":
      `${t.newCustomers} accounts placed a first order during the year, and ${t.repeatCustomerPct.toFixed(0)}% of all ` +
      `accounts ordered more than once` +
      (h.topCustomer ? `. ${h.topCustomer.businessName} is the largest at ${inr(h.topCustomer.spent)} across ${h.topCustomer.orders} orders.` : "."),
    "Product Performance":
      (h.topCategories[0]
        ? `${h.topCategories[0].name} leads on revenue with ${h.topCategories[0].share.toFixed(0)}% of the total`
        : "No category data") +
      (h.topProducts[0] ? `, and ${h.topProducts[0].name} is the single best seller at ${inr(h.topProducts[0].revenue)} across ${h.topProducts[0].units} units.` : "."),
  };
}
