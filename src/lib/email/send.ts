import "server-only";
import { Prisma, type EmailKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransport, readMailConfig, missingMailSettings, redact } from "./transport";
import { renderOrderEmail, type OrderEmailData } from "./templates";

/**
 * SENDING A CUSTOMER EMAIL
 * ────────────────────────
 * Two rules govern everything here.
 *
 * 1. An order is never harmed by mail. This is called AFTER the order
 *    transaction has committed, it is never awaited inside one, and every
 *    failure path returns rather than throws. A shop that cannot send email
 *    must still be able to take orders.
 *
 * 2. A retry must not send a second copy. EmailLog has a unique constraint on
 *    (orderId, kind); the row is claimed BEFORE the message goes out, so a
 *    concurrent or repeated attempt collides on the constraint and stops.
 *
 * If the EmailLog table does not exist yet — the migration has not been applied
 * to that database — sending is skipped rather than crashing the caller. That
 * keeps a database without the migration fully functional for orders.
 */

export type SendOutcome =
  | { ok: true; skipped?: false; messageId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

/** Loads everything an order email needs, from the order snapshot. */
export async function loadOrderEmailData(orderId: string): Promise<OrderEmailData | null> {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true, createdAt: true, status: true, paymentMethod: true,
      businessName: true, shippingAddress: true,
      subtotal: true, bulkDiscount: true, couponDiscount: true,
      deliveryFee: true, tax: true, total: true,
      items: {
        select: {
          productName: true, variantName: true, quantity: true,
          unitPrice: true, lineTotal: true,
          product: { select: { sku: true } },
        },
      },
      delivery: { select: { trackingNumber: true, courierName: true } },
      customer: { select: { name: true, email: true } },
    },
  });
  if (!o) return null;

  const ship = (o.shippingAddress ?? {}) as Record<string, string>;
  return {
    orderNumber: o.orderNumber,
    placedAt: o.createdAt,
    // The address snapshot holds who actually placed this order; the account
    // name is the fallback.
    contactName: ship.contactName || o.customer.name,
    businessName: o.businessName ?? null,
    // Always the address the customer typed at checkout — that is the one they
    // expect the confirmation at, and it is stored on the order.
    email: ship.email || o.customer.email,
    status: o.status,
    paymentMethod: o.paymentMethod,
    items: o.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      sku: i.product.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
    subtotal: Number(o.subtotal),
    wholesaleSavings: Number(o.bulkDiscount),
    couponDiscount: Number(o.couponDiscount),
    deliveryFee: Number(o.deliveryFee),
    tax: Number(o.tax),
    total: Number(o.total),
    shipping: {
      line1: ship.line1 ?? "", line2: ship.line2, city: ship.city ?? "",
      state: ship.state ?? "", pincode: ship.pincode ?? "", phone: ship.phone,
    },
    trackingNumber: o.delivery?.trackingNumber ?? null,
    courierName: o.delivery?.courierName ?? null,
  };
}

/**
 * Sends one customer email for an order, at most once per kind.
 * Never throws — the caller is on the order path.
 */
export async function sendOrderEmail(orderId: string, kind: EmailKind): Promise<SendOutcome> {
  try {
    const data = await loadOrderEmailData(orderId);
    if (!data) return { ok: false, skipped: true, reason: "order not found" };
    if (!data.email) return { ok: false, skipped: true, reason: "order carries no email address" };

    const { subject, html, text } = renderOrderEmail(kind, data);

    // Claim the slot first. A duplicate request loses the race here and stops,
    // before any message can be handed to the provider.
    try {
      await prisma.emailLog.create({
        data: { orderId, kind, recipient: data.email, subject, status: "PENDING", attempts: 1 },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { ok: false, skipped: true, reason: "already sent for this order" };
      }
      // Most likely the migration has not been applied to this database.
      // Orders must keep working, so mail is skipped rather than retried.
      console.error(`[email] cannot record ${kind} for order ${orderId}: ${redact(String(err))}`);
      return { ok: false, skipped: true, reason: "email log unavailable" };
    }

    const cfg = readMailConfig();
    const transport = getTransport();
    if (!cfg || !transport) {
      const reason = `mail not configured (missing: ${missingMailSettings().join(", ")})`;
      await mark(orderId, kind, "SKIPPED", reason);
      console.warn(`[email] ${kind} for ${data.orderNumber} not sent — ${reason}`);
      return { ok: false, skipped: true, reason };
    }

    const info = await transport.sendMail({
      from: cfg.from,
      to: data.email,
      replyTo: cfg.replyTo,
      subject,
      html,
      text,
    });

    await mark(orderId, kind, "SENT", info.messageId ?? "accepted");
    // Recipient is deliberately not logged; the EmailLog row holds it.
    console.info(`[email] ${kind} sent for ${data.orderNumber}`);
    return { ok: true, messageId: info.messageId ?? "accepted" };
  } catch (err) {
    const detail = redact(err instanceof Error ? err.message : String(err));
    await mark(orderId, kind, "FAILED", detail).catch(() => undefined);
    console.error(`[email] ${kind} failed for order ${orderId}: ${detail}`);
    return { ok: false, error: detail };
  }
}

async function mark(orderId: string, kind: EmailKind, status: "SENT" | "FAILED" | "SKIPPED", detail: string) {
  await prisma.emailLog.update({
    where: { orderId_kind: { orderId, kind } },
    data: { status, detail, sentAt: status === "SENT" ? new Date() : null },
  });
}

/**
 * Fire-and-forget wrapper for the order path.
 *
 * The customer must not wait on an SMTP dialogue to see their confirmation
 * page, and a mail failure must not surface as a failed order. The promise is
 * deliberately not awaited; its rejection is handled here so it can never
 * become an unhandled rejection.
 */
export function queueOrderEmail(orderId: string, kind: EmailKind): void {
  void sendOrderEmail(orderId, kind).catch((err) => {
    console.error(`[email] unexpected failure for order ${orderId}: ${redact(String(err))}`);
  });
}

/**
 * Retries everything that failed. Rows are reset so the normal path can claim
 * them again, which keeps one implementation of "send" rather than two.
 */
export async function retryFailedEmails(limit = 50) {
  let failed: { orderId: string; kind: EmailKind }[] = [];
  try {
    failed = await prisma.emailLog.findMany({
      where: { status: { in: ["FAILED", "SKIPPED"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { orderId: true, kind: true },
    });
  } catch {
    return { attempted: 0, sent: 0, stillFailing: 0, note: "email log unavailable" };
  }

  let sent = 0, stillFailing = 0;
  for (const row of failed) {
    await prisma.emailLog.delete({ where: { orderId_kind: { orderId: row.orderId, kind: row.kind } } }).catch(() => undefined);
    const r = await sendOrderEmail(row.orderId, row.kind);
    if (r.ok) sent++; else stillFailing++;
  }
  return { attempted: failed.length, sent, stillFailing };
}
