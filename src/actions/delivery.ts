"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { deliverySchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/** Delivery status → the order status it implies, so both stay in step. */
const ORDER_FOR_DELIVERY_STATUS: Record<string, OrderStatus | undefined> = {
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

export async function updateDeliveryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const parsed = deliverySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const { orderId, status, courierName, trackingNumber, expectedDeliveryDate, deliveryNotes } =
      parsed.data;

    const expected = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (!order) throw new Error("Order not found");
      if (order.status === "CANCELLED") {
        throw new Error("This order is cancelled — delivery cannot be updated");
      }

      await tx.delivery.upsert({
        where: { orderId },
        update: {
          status,
          courierName: courierName || null,
          trackingNumber: trackingNumber || null,
          expectedDeliveryDate: expected && !Number.isNaN(expected.getTime()) ? expected : null,
          deliveryNotes: deliveryNotes || null,
        },
        create: {
          orderId,
          status,
          courierName: courierName || null,
          trackingNumber: trackingNumber || null,
          expectedDeliveryDate: expected && !Number.isNaN(expected.getTime()) ? expected : null,
          deliveryNotes: deliveryNotes || null,
        },
      });

      const nextOrderStatus = ORDER_FOR_DELIVERY_STATUS[status];
      if (nextOrderStatus) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: nextOrderStatus,
            ...(nextOrderStatus === "DELIVERED" ? { paymentStatus: "PAID" as const } : {}),
          },
        });
      }
    });

    revalidatePath("/admin/delivery");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/orders");
    return { ok: true, message: "Delivery updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
