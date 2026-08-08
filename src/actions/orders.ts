"use server";

import { revalidatePath } from "next/cache";
import type { DeliveryStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOrderForCustomer } from "@/lib/orders";
import { getCurrentCustomerId, requireAdminAction } from "@/lib/auth";
import { checkoutSchema, fieldErrors, orderStatusSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

export interface PlaceOrderResult extends ActionState {
  orderId?: string;
  orderNumber?: string;
}

/**
 * Places an order for the signed-in customer.
 *
 * Validation and the money math live in `createOrderForCustomer`
 * (`src/lib/orders.ts`); this wrapper only supplies the authenticated
 * customer id and shapes the result for the checkout form.
 */
export async function placeOrderAction(
  _prev: PlaceOrderResult,
  formData: FormData
): Promise<PlaceOrderResult> {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return { ok: false, error: "Please sign in to place an order" };

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  try {
    const order = await createOrderForCustomer(customerId, {
      businessName: input.businessName,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      gstNumber: input.gstNumber || undefined,
      line1: input.line1,
      line2: input.line2 || undefined,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      deliveryInstructions: input.deliveryInstructions || undefined,
      couponCode: input.couponCode || undefined,
      paymentMethod: input.paymentMethod,
    });

    revalidatePath("/orders");
    revalidatePath("/cart");
    revalidatePath("/account");
    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Could not place the order. Please try again.") };
  }
}

export async function getOrderById(orderId: string) {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return null;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { slug: true, images: true } } } },
      delivery: true,
    },
  });
  if (!order || order.customerId !== customerId) return null;
  return order;
}

export async function getMyOrders() {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return [];
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { items: true, delivery: true },
  });
}

/** Order status → the delivery status it implies, so the two never drift apart. */
const DELIVERY_FOR_ORDER_STATUS: Partial<Record<OrderStatus, DeliveryStatus>> = {
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

/**
 * Admin: update an order's status.
 * Cancelling returns the reserved stock and logs a RETURN transaction, so
 * inventory stays truthful and cancelled orders drop out of revenue.
 */
export async function updateOrderStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdminAction();
    const parsed = orderStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

    const { orderId, status } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found");
      if (order.status === status) return;

      if (order.status === "DELIVERED" && status !== "DELIVERED") {
        throw new Error("A delivered order cannot be moved back to an earlier status");
      }
      if (order.status === "CANCELLED") {
        throw new Error("A cancelled order cannot change status");
      }

      // Cancelling: put the stock back.
      if (status === "CANCELLED") {
        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: { productVariantId: item.productVariantId },
          });
          if (!inv) continue;
          await tx.inventory.update({
            where: { id: inv.id },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              action: "RETURN",
              quantity: item.quantity,
              reason: `Order ${order.orderNumber} cancelled`,
              adminId: admin.id,
              orderId: order.id,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === "DELIVERED" ? { paymentStatus: "PAID" as const } : {}),
        },
      });

      const deliveryStatus = DELIVERY_FOR_ORDER_STATUS[status];
      if (deliveryStatus) {
        await tx.delivery.upsert({
          where: { orderId },
          update: { status: deliveryStatus },
          create: { orderId, status: deliveryStatus },
        });
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/delivery");
    revalidatePath("/orders");
    return { ok: true, message: "Order status updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Customer: cancel their own order while it is still cancellable. */
export async function cancelMyOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const customerId = await getCurrentCustomerId();
    if (!customerId) return { ok: false, error: "Please sign in" };
    const orderId = String(formData.get("orderId") ?? "");

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.customerId !== customerId) throw new Error("Order not found");
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw new Error("This order can no longer be cancelled. Please contact us for help.");
      }

      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { productVariantId: item.productVariantId },
        });
        if (!inv) continue;
        await tx.inventory.update({
          where: { id: inv.id },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            action: "RETURN",
            quantity: item.quantity,
            reason: `Order ${order.orderNumber} cancelled by customer`,
            orderId: order.id,
          },
        });
      }

      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      await tx.delivery.updateMany({ where: { orderId }, data: { status: "FAILED" } });
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, message: "Order cancelled" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
