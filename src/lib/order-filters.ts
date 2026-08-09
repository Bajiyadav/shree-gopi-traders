import type { Prisma } from "@prisma/client";

/**
 * Shared order filtering, so the admin list and the CSV export can never
 * disagree about what "the current filter" means — the export is exactly
 * what is on screen.
 */

export const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "PROCESSING", "PACKED",
  "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "COD"] as const;

export const DATE_RANGES = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
] as const;

export interface OrderFilters {
  q?: string;
  status?: (typeof ORDER_STATUSES)[number];
  payment?: (typeof PAYMENT_STATUSES)[number];
  range?: string;
  from?: string;
  to?: string;
}

export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const status = one(sp.status);
  const payment = one(sp.payment);
  return {
    q: one(sp.q)?.trim() || undefined,
    status: ORDER_STATUSES.includes(status as never) ? (status as OrderFilters["status"]) : undefined,
    payment: PAYMENT_STATUSES.includes(payment as never) ? (payment as OrderFilters["payment"]) : undefined,
    range: one(sp.range) || undefined,
    from: one(sp.from) || undefined,
    to: one(sp.to) || undefined,
  };
}

/** Resolves a named range (or an explicit custom range) to a date window. */
export function resolveDateWindow(filters: OrderFilters): { gte?: Date; lt?: Date } | undefined {
  const now = new Date();

  if (filters.from || filters.to) {
    const gte = filters.from ? new Date(filters.from) : undefined;
    // `to` is inclusive to the user, so push the bound to the next midnight.
    const to = filters.to ? new Date(filters.to) : undefined;
    if (to) to.setDate(to.getDate() + 1);
    const valid = (d?: Date) => (d && !Number.isNaN(d.getTime()) ? d : undefined);
    const window = { gte: valid(gte), lt: valid(to) };
    return window.gte || window.lt ? window : undefined;
  }

  switch (filters.range) {
    case "today":
      return { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return { gte: d };
    }
    case "month":
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "3m":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()) };
    case "6m":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()) };
    case "12m":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()) };
    default:
      return undefined;
  }
}

export function buildOrderWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const createdAt = resolveDateWindow(filters);
  const q = filters.q;

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.payment ? { paymentStatus: filters.payment } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { businessName: { contains: q, mode: "insensitive" as const } },
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { email: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q } } },
            { customer: { businessProfile: { businessName: { contains: q, mode: "insensitive" as const } } } },
            // SKU search — matches the snapshot on the order's line items.
            { items: { some: { product: { sku: { contains: q, mode: "insensitive" as const } } } } },
          ],
        }
      : {}),
  };
}
