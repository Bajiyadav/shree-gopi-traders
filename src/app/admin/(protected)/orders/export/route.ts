import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { buildOrderWhere, parseOrderFilters } from "@/lib/order-filters";

export const dynamic = "force-dynamic";

/** RFC 4180 escaping — a business name containing a comma must not shift columns. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADERS = [
  "Order Number", "Order Date", "Customer", "Business", "Phone", "Email",
  "Status", "Payment Method", "Payment Status", "Items",
  "Subtotal", "Wholesale Savings", "Coupon Discount", "Delivery Fee", "Tax", "Total",
  "Invoice Number",
];

/**
 * Exports the orders matching the CURRENT admin filters as CSV.
 *
 * Admin-only, and deliberately narrow: no password hashes, no session data,
 * no customer address beyond what appears on the order.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAction();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const filters = parseOrderFilters(Object.fromEntries(request.nextUrl.searchParams));
  const where: Prisma.OrderWhereInput = buildOrderWhere(filters);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000, // a hard ceiling so one click cannot stream the whole table
    include: {
      customer: { select: { name: true, email: true, phone: true, businessProfile: { select: { businessName: true } } } },
      items: { select: { id: true } },
      invoice: { select: { invoiceNumber: true } },
    },
  });

  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.createdAt.toISOString().slice(0, 10),
      o.customer.name,
      o.businessName ?? o.customer.businessProfile?.businessName ?? "",
      o.customer.phone,
      o.customer.email,
      o.status,
      o.paymentMethod,
      o.paymentStatus,
      o.items.length,
      o.subtotal.toFixed(2),
      o.bulkDiscount.toFixed(2),
      o.couponDiscount.toFixed(2),
      o.deliveryFee.toFixed(2),
      o.tax.toFixed(2),
      o.total.toFixed(2),
      o.invoice?.invoiceNumber ?? "",
    ].map(csvCell).join(",")
  );

  // BOM so Excel opens UTF-8 (and the ₹ symbol) correctly.
  const csv = "﻿" + [HEADERS.join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sgt-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
