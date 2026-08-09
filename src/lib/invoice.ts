import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * INVOICING
 * ─────────
 * An invoice fixes an identifier and a date against an order. It stores no
 * money at all — every figure on the printed bill is read from the Order and
 * its OrderItems, which already hold immutable snapshots taken at checkout.
 *
 * That is the whole design: a bill cannot drift from the order it bills,
 * and re-pricing a product tomorrow cannot alter an invoice issued today.
 */

export const INVOICE_PREFIX = "SGT-INV";

/** Statuses that may be billed. A cancelled order has nothing to invoice. */
const BILLABLE_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export function isBillable(status: string) {
  return (BILLABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Generates the next invoice number for the current year:
 * SGT-INV-2026-000001
 *
 * Uniqueness is guaranteed by the unique index; this probes forward from the
 * current count and the caller retries on a P2002 clash, the same approach
 * the order numbering uses.
 */
async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${INVOICE_PREFIX}-${year}-`;

  const countThisYear = await tx.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });

  for (let offset = 1; offset <= 50; offset++) {
    const candidate = `${prefix}${String(countThisYear + offset).padStart(6, "0")}`;
    const exists = await tx.invoice.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  const highest = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const lastSeq = highest ? Number(highest.invoiceNumber.split("-")[3]) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(6, "0")}`;
}

/**
 * Returns the order's invoice, creating it on first request.
 *
 * Idempotent: the unique constraint on orderId means two concurrent requests
 * cannot produce two invoices for the same order — the loser reads the winner's.
 */
export async function ensureInvoice(orderId: string) {
  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const already = await tx.invoice.findUnique({ where: { orderId } });
        if (already) return already;
        const invoiceNumber = await nextInvoiceNumber(tx);
        return tx.invoice.create({ data: { orderId, invoiceNumber } });
      });
    } catch (err) {
      const clash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!clash) throw err;
      const raced = await prisma.invoice.findUnique({ where: { orderId } });
      if (raced) return raced;
    }
  }
  throw new Error("Could not generate an invoice number. Please try again.");
}

/**
 * Recomputes the bill from the stored order and asserts it balances.
 *
 * Nothing is invented: tax is whatever the order recorded (zero for every
 * COD order this store has taken), and the arithmetic is checked so a bill
 * can never present a total the customer was not charged.
 */
export function buildInvoiceTotals(order: {
  subtotal: Prisma.Decimal;
  bulkDiscount: Prisma.Decimal;
  couponDiscount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  items: { listPrice: Prisma.Decimal; unitPrice: Prisma.Decimal; quantity: number; lineTotal: Prisma.Decimal }[];
}) {
  const subtotal = order.subtotal.toNumber();
  const wholesaleSavings = order.bulkDiscount.toNumber();
  const couponDiscount = order.couponDiscount.toNumber();
  const deliveryFee = order.deliveryFee.toNumber();
  const tax = order.tax.toNumber();
  const total = order.total.toNumber();

  const expected = subtotal - couponDiscount + deliveryFee + tax;
  // Decimal(10,2) rounding means an exact equality check is too brittle.
  const balances = Math.abs(expected - total) < 0.01;

  const listValue = order.items.reduce(
    (sum, i) => sum + i.listPrice.toNumber() * i.quantity,
    0
  );

  return {
    subtotal,
    wholesaleSavings,
    couponDiscount,
    deliveryFee,
    tax,
    total,
    listValue,
    hasTax: tax > 0,
    balances,
    /** What the customer would have paid at list price, for the savings line. */
    totalSavings: wholesaleSavings + couponDiscount,
  };
}
