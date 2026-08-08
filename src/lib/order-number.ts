import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export const ORDER_NUMBER_PREFIX = "SGT";

type Db = PrismaClient | Prisma.TransactionClient;

/** Formats a Date as the YYYYMMDD segment of an order number. */
export function orderDatePart(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Generates a unique order number in the format SGT-YYYYMMDD-XXXX
 * (e.g. SGT-20260808-0001).
 *
 * The sequence is derived from the count of orders already created today,
 * then probed forward until a free slot is found. Uniqueness is ultimately
 * guaranteed by the unique index on `Order.orderNumber` — callers run this
 * inside the order transaction and retry the transaction on a P2002 clash.
 */
export async function generateOrderNumber(tx: Db = prisma): Promise<string> {
  const now = new Date();
  const datePart = orderDatePart(now);

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const countToday = await tx.order.count({
    where: { createdAt: { gte: startOfDay, lt: endOfDay } },
  });

  // Probe forward from the count until an unused sequence is found.
  for (let offset = 1; offset <= 50; offset++) {
    const candidate = `${ORDER_NUMBER_PREFIX}-${datePart}-${String(countToday + offset).padStart(4, "0")}`;
    const exists = await tx.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  // Pathological fallback — still unique thanks to the DB constraint + retry.
  const highest = await tx.order.findFirst({
    where: { orderNumber: { startsWith: `${ORDER_NUMBER_PREFIX}-${datePart}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const lastSeq = highest ? Number(highest.orderNumber.split("-")[2]) : 0;
  return `${ORDER_NUMBER_PREFIX}-${datePart}-${String(lastSeq + 1).padStart(4, "0")}`;
}
