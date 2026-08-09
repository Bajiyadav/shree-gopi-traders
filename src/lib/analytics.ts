import "server-only";
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * ADMIN ANALYTICS ENGINE
 * ──────────────────────
 * Every figure here is computed live from the database. Nothing is
 * hardcoded. "Last 12 months" always rolls forward from the current
 * date — re-run this next year and the window moves with it.
 *
 * Cancelled orders are excluded from all revenue figures.
 */

const VALID_REVENUE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const; // everything except CANCELLED

function monthLabel(d: Date) {
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

/** Builds the rolling list of the last N months (oldest → newest), each with start/end bounds. */
export function getLastNMonths(n: number, from: Date = new Date()) {
  const months: { label: string; year: number; month: number; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(from.getFullYear(), from.getMonth() - i, 1);
    const end = new Date(from.getFullYear(), from.getMonth() - i + 1, 1);
    months.push({ label: monthLabel(start), year: start.getFullYear(), month: start.getMonth(), start, end });
  }
  return months;
}

export interface MonthlyPoint {
  month: string;
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
  itemsSold: number;
  avgOrderValue: number;
  /** Percent change in revenue vs the previous month. null for the first
   *  month, where there is no prior month — showing 0% there would imply
   *  flat trade rather than "no basis for comparison". */
  revenueGrowth: number | null;
}

/**
 * Revenue + order counts per month for the rolling last 12 months.
 *
 * The window is derived from `from` (defaults to now) every time this runs, so
 * it always ends on the current month — nothing about it is hardcoded.
 * Cancelled orders are counted separately and contribute zero revenue.
 */
export async function getMonthlyRevenueAndOrders(
  from: Date = new Date(),
  monthCount = 12
): Promise<MonthlyPoint[]> {
  const months = getLastNMonths(monthCount, from);
  const windowStart = months[0].start;
  const windowEnd = months[months.length - 1].end;

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: windowStart, lt: windowEnd } },
    select: {
      total: true,
      createdAt: true,
      status: true,
      items: { select: { quantity: true } },
    },
  });

  const series = months.map((m) => {
    const inMonth = orders.filter((o) => o.createdAt >= m.start && o.createdAt < m.end);
    const earning = inMonth.filter((o) => o.status !== "CANCELLED");
    const revenue = earning.reduce((sum, o) => sum.add(o.total), new Prisma.Decimal(0)).toNumber();
    const itemsSold = earning.reduce(
      (n, o) => n + o.items.reduce((q, i) => q + i.quantity, 0),
      0
    );

    return {
      month: m.label,
      revenue,
      orders: inMonth.length,
      completed: inMonth.filter((o) => o.status === "DELIVERED").length,
      cancelled: inMonth.filter((o) => o.status === "CANCELLED").length,
      itemsSold,
      avgOrderValue: earning.length ? revenue / earning.length : 0,
      revenueGrowth: null as number | null,
    };
  });

  // Month-over-month growth, computed after the series exists.
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].revenue;
    // Growth from a zero base is undefined, not infinite.
    series[i].revenueGrowth = prev > 0 ? ((series[i].revenue - prev) / prev) * 100 : null;
  }

  return series;
}

/**
 * Wholesale tier analysis — how much trade actually happens at each quantity
 * band, and what it saved customers.
 *
 * The band is derived from the quantity on the historical OrderItem, not from
 * today's tier table, so re-pricing a product later cannot rewrite past
 * analysis.
 */
export async function getWholesaleAnalysis(since: Date) {
  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    select: {
      quantity: true,
      listPrice: true,
      unitPrice: true,
      lineTotal: true,
      orderId: true,
    },
  });

  const BANDS = [
    { label: "1 – 4 units", min: 1, max: 4 },
    { label: "5 – 9 units", min: 5, max: 9 },
    { label: "10 – 24 units", min: 10, max: 24 },
    { label: "25+ units", min: 25, max: Number.MAX_SAFE_INTEGER },
  ];

  const rows = BANDS.map((band) => {
    const inBand = items.filter((i) => i.quantity >= band.min && i.quantity <= band.max);
    const revenue = inBand.reduce((s, i) => s.add(i.lineTotal), new Prisma.Decimal(0));
    const savings = inBand.reduce(
      (s, i) => s.add(i.listPrice.sub(i.unitPrice).mul(i.quantity)),
      new Prisma.Decimal(0)
    );
    const listValue = inBand.reduce(
      (s, i) => s.add(i.listPrice.mul(i.quantity)),
      new Prisma.Decimal(0)
    );
    return {
      label: band.label,
      orders: new Set(inBand.map((i) => i.orderId)).size,
      units: inBand.reduce((n, i) => n + i.quantity, 0),
      revenue: revenue.toNumber(),
      savings: savings.toNumber(),
      avgDiscountPercent: listValue.gt(0)
        ? savings.div(listValue).mul(100).toNumber()
        : 0,
    };
  });

  const totalUnits = rows.reduce((n, r) => n + r.units, 0);
  const totalSavings = rows.reduce((n, r) => n + r.savings, 0);
  const discountedUnits = rows.filter((r) => r.label !== "1 – 4 units").reduce((n, r) => n + r.units, 0);

  return {
    rows,
    totalUnits,
    totalSavings,
    discountedUnits,
    /** Share of units that actually moved at a wholesale (below-list) rate. */
    tierPenetration: totalUnits ? (discountedUnits / totalUnits) * 100 : 0,
  };
}

/** Cancelled-order analysis, kept separate so it never pollutes revenue. */
export async function getCancellationAnalysis(since: Date) {
  const [cancelled, total] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: "CANCELLED" },
      select: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
  ]);

  const value = cancelled.reduce((s, o) => s.add(o.total), new Prisma.Decimal(0)).toNumber();

  return {
    count: cancelled.length,
    value,
    rate: total ? (cancelled.length / total) * 100 : 0,
    totalOrders: total,
  };
}

/** Total units sold in a window — cancelled orders excluded. */
export async function getItemsSold(since: Date) {
  const agg = await prisma.orderItem.aggregate({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/** Headline dashboard cards: today / this month / last 12 months, for revenue and orders. */
export async function getDashboardSummary() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    todayOrders,
    monthOrders,
    twelveMoOrders,
    totalCustomers,
    pendingOrders,
    totalProducts,
    newCustomers,
    deliveredOrders,
    cancelledOrders,
    totalOrders,
  ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startOfToday }, status: { in: [...VALID_REVENUE_STATUSES] } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startOfMonth }, status: { in: [...VALID_REVENUE_STATUSES] } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: start12Months }, status: { in: [...VALID_REVENUE_STATUSES] } },
        select: { total: true },
      }),
    prisma.customer.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.count(),
  ]);

  const sum = (rows: { total: Prisma.Decimal }[]) =>
    rows.reduce((s, r) => s.add(r.total), new Prisma.Decimal(0)).toNumber();

  // Low stock needs a column-to-column comparison; Prisma can't do that
  // directly in `findMany`, so do it with $queryRaw for correctness.
  const lowStockRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count FROM "Inventory" WHERE stock <= "lowStockThreshold" AND stock > 0
  `;
  const outOfStockRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count FROM "Inventory" WHERE stock <= 0
  `;

  return {
    todayRevenue: sum(todayOrders),
    todayOrders: todayOrders.length,
    monthRevenue: sum(monthOrders),
    monthOrders: monthOrders.length,
    last12MoRevenue: sum(twelveMoOrders),
    last12MoOrders: twelveMoOrders.length,
    avgOrderValue: twelveMoOrders.length ? sum(twelveMoOrders) / twelveMoOrders.length : 0,
    totalCustomers,
    newCustomers,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    totalOrders,
    totalProducts,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
    outOfStockCount: Number(outOfStockRows[0]?.count ?? 0),
  };
}

/** Revenue + order totals for an arbitrary window, used by the date filters. */
export async function getWindowSummary(since: Date) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { total: true, status: true, customerId: true },
  });

  const earning = orders.filter((o) => o.status !== "CANCELLED");
  const revenue = earning.reduce((s, o) => s.add(o.total), new Prisma.Decimal(0)).toNumber();

  return {
    revenue,
    orders: orders.length,
    earningOrders: earning.length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    avgOrderValue: earning.length ? revenue / earning.length : 0,
    uniqueCustomers: new Set(orders.map((o) => o.customerId)).size,
  };
}

/** Top-selling products by units sold + revenue, within a date range. */
export async function getTopProducts(since: Date, limit = 10) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId", "productName"],
    where: { order: { createdAt: { gte: since }, status: { in: [...VALID_REVENUE_STATUSES] } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  return rows.map((r) => ({
    productId: r.productId,
    name: r.productName,
    unitsSold: r._sum.quantity ?? 0,
    revenue: r._sum.lineTotal?.toNumber() ?? 0,
  }));
}

/** Top categories by units sold + revenue + order count. */
export async function getTopCategories(since: Date, limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { in: [...VALID_REVENUE_STATUSES] } } },
    select: {
      quantity: true,
      lineTotal: true,
      orderId: true,
      product: { select: { category: { select: { id: true, name: true } } } },
    },
  });

  const byCategory = new Map<
    string,
    { name: string; unitsSold: number; revenue: Prisma.Decimal; orderIds: Set<string> }
  >();

  for (const item of items) {
    const cat = item.product.category;
    const entry = byCategory.get(cat.id) ?? {
      name: cat.name,
      unitsSold: 0,
      revenue: new Prisma.Decimal(0),
      orderIds: new Set<string>(),
    };
    entry.unitsSold += item.quantity;
    entry.revenue = entry.revenue.add(item.lineTotal);
    entry.orderIds.add(item.orderId);
    byCategory.set(cat.id, entry);
  }

  return [...byCategory.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      unitsSold: v.unitsSold,
      revenue: v.revenue.toNumber(),
      orderCount: v.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/** Customer analytics: new vs returning, top customers by spend. */
export async function getCustomerAnalytics(since: Date) {
  const [newCustomers, ordersInRange] = await Promise.all([
    prisma.customer.count({ where: { createdAt: { gte: since } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { in: [...VALID_REVENUE_STATUSES] } },
      select: { customerId: true, total: true, businessName: true, createdAt: true },
    }),
  ]);

  const byCustomer = new Map<
    string,
    { orders: number; spent: Prisma.Decimal; lastOrder: Date; businessName: string | null }
  >();

  for (const o of ordersInRange) {
    const entry = byCustomer.get(o.customerId) ?? {
      orders: 0,
      spent: new Prisma.Decimal(0),
      lastOrder: o.createdAt,
      businessName: o.businessName,
    };
    entry.orders += 1;
    entry.spent = entry.spent.add(o.total);
    if (o.createdAt > entry.lastOrder) entry.lastOrder = o.createdAt;
    byCustomer.set(o.customerId, entry);
  }

  const returningCustomers = [...byCustomer.values()].filter((c) => c.orders > 1).length;
  const totalSpent = [...byCustomer.values()].reduce((s, c) => s.add(c.spent), new Prisma.Decimal(0));
  const avgSpend = byCustomer.size ? totalSpent.toNumber() / byCustomer.size : 0;

  const topCustomers = [...byCustomer.entries()]
    .map(([customerId, v]) => ({
      customerId,
      businessName: v.businessName ?? "—",
      orders: v.orders,
      totalSpent: v.spent.toNumber(),
      lastOrder: v.lastOrder,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return { newCustomers, returningCustomers, avgSpend, topCustomers };
}

/** Order status breakdown for the chart. */
export async function getOrderStatusBreakdown(since: Date) {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

/** Resolves a named filter window ("Last 7 Days" etc.) to a `since` date. */
export function resolveAnalyticsWindow(
  filter: "7d" | "30d" | "3m" | "6m" | "12m" | "custom",
  customStart?: Date
) {
  const now = new Date();
  switch (filter) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "12m":
      return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    case "custom":
      return customStart ?? new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}

/**
 * What the shelves are worth.
 *
 * For a trading business, stock is where most of the working capital sits, and
 * the dashboard had no figure for it — revenue and orders say nothing about
 * how much cash is currently on the racks.
 *
 * Valued at the price a single unit sells for, since that is the only price
 * this system knows. It is a selling-price valuation, not a cost valuation:
 * accounts value closing stock at the lower of cost and net realisable value,
 * and purchase cost is not recorded here. Useful for judging exposure and
 * reorder pressure, not for filing.
 */
export async function getInventorySummary() {
  const rows = await prisma.inventory.findMany({
    where: { productVariant: { isActive: true, product: { isActive: true } } },
    select: {
      stock: true,
      lowStockThreshold: true,
      productVariant: { select: { price: true, salePrice: true } },
    },
  });

  let units = 0;
  let value = new Prisma.Decimal(0);
  let outOfStock = 0;
  let lowStock = 0;

  for (const r of rows) {
    const stock = Math.max(0, r.stock);
    units += stock;
    const unit = r.productVariant.salePrice ?? r.productVariant.price;
    value = value.add(unit.mul(stock));
    if (r.stock <= 0) outOfStock++;
    else if (r.stock <= r.lowStockThreshold) lowStock++;
  }

  return {
    units,
    value: value.toNumber(),
    skus: rows.length,
    outOfStock,
    lowStock,
  };
}
