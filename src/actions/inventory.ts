"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { fieldErrors, inventoryAdjustSchema, lowStockThresholdSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/**
 * All stock movements go through here so that every change leaves an
 * InventoryTransaction behind. Stock is never allowed below zero.
 */
export async function adjustInventoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdminAction();
    const parsed = inventoryAdjustSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const { productVariantId, action, quantity, reason } = parsed.data;

    // RESTOCK/RETURN add stock; DAMAGE removes it; ADJUSTMENT takes the sign given.
    const delta =
      action === "RESTOCK" || action === "RETURN"
        ? Math.abs(quantity)
        : action === "DAMAGE"
          ? -Math.abs(quantity)
          : quantity;

    await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.upsert({
        where: { productVariantId },
        update: {},
        create: { productVariantId, stock: 0, lowStockThreshold: 5 },
      });

      const nextStock = inventory.stock + delta;
      if (nextStock < 0) {
        throw new Error(
          `Cannot remove ${Math.abs(delta)} units — only ${inventory.stock} in stock.`
        );
      }

      await tx.inventory.update({ where: { id: inventory.id }, data: { stock: nextStock } });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          action,
          quantity: delta,
          reason: reason || null,
          adminId: admin.id,
        },
      });
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    revalidatePath("/products");
    return { ok: true, message: "Stock updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateLowStockThresholdAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const parsed = lowStockThresholdSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

    await prisma.inventory.upsert({
      where: { productVariantId: parsed.data.productVariantId },
      update: { lowStockThreshold: parsed.data.lowStockThreshold },
      create: {
        productVariantId: parsed.data.productVariantId,
        stock: 0,
        lowStockThreshold: parsed.data.lowStockThreshold,
      },
    });

    revalidatePath("/admin/inventory");
    return { ok: true, message: "Threshold updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
