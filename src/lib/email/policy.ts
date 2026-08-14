import type { OrderStatus } from "@prisma/client";
import type { EmailKind } from "./types";

/**
 * WHICH STATUS CHANGES EMAIL THE CUSTOMER
 *
 * A wholesale buyer wants to know four things: that the order was taken, that
 * it was accepted, that it is coming, and that it arrived. Everything else is
 * internal warehouse movement, and mailing it trains people to ignore us.
 *
 *   CONFIRMED         → yes. Stock checked and the order is real.
 *   PROCESSING        → no.  Internal: being picked.
 *   PACKED            → no.  Internal: boxed, not yet moving.
 *   SHIPPED           → yes. It has left, and tracking now exists.
 *   OUT_FOR_DELIVERY  → yes. Matters most for COD — cash must be ready.
 *   DELIVERED         → yes. Closes the loop.
 *   CANCELLED         → yes. Nothing is payable; silence here causes calls.
 *   PENDING           → no.  The placement confirmation already covered it.
 *
 * The placement email (ORDER_CONFIRMATION) is separate and always sent.
 */
export const EMAIL_FOR_ORDER_STATUS: Partial<Record<OrderStatus, EmailKind>> = {
  CONFIRMED: "ORDER_CONFIRMED",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
};
