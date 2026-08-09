import "server-only";
import { prisma } from "./prisma";
import { getCurrentCustomerId, getCurrentAdminId } from "./auth";

/**
 * Authorization for billing. Split from `invoice.ts` deliberately: that module
 * holds pure money logic and must stay importable outside a Next request
 * (tests, scripts), while this one reads the session and therefore cannot.
 */

export type InvoiceViewer = { kind: "customer"; id: string } | { kind: "admin"; id: string };

/**
 * Loads an order for billing ONLY if the caller is allowed to see it: the
 * customer who placed it, or an authenticated admin.
 *
 * The order id in the URL is an untrusted identifier — changing it must not
 * reveal another business's bill. Returns null rather than throwing so callers
 * can render a 404 and avoid confirming that an order exists.
 */
export async function getBillableOrder(orderId: string) {
  const [customerId, adminId] = await Promise.all([
    getCurrentCustomerId(),
    getCurrentAdminId(),
  ]);
  if (!customerId && !adminId) return null;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { include: { businessProfile: true } },
      items: {
        include: { product: { select: { sku: true, slug: true, images: true, moq: true } } },
      },
      delivery: true,
      invoice: true,
    },
  });
  if (!order) return null;

  let viewer: InvoiceViewer;
  if (adminId) {
    const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } });
    if (!admin) return null;
    viewer = { kind: "admin", id: admin.id };
  } else {
    // Ownership is proven here, never assumed from the URL.
    if (order.customerId !== customerId) return null;
    viewer = { kind: "customer", id: customerId! };
  }

  return { order, viewer };
}

