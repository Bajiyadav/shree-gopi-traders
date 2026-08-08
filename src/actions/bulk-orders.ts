"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomerId, requireAdminAction } from "@/lib/auth";
import { bulkOrderSchema, bulkOrderUpdateSchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/** Public: a business requests a bulk quote. Works signed-in or signed-out. */
export async function submitBulkOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = bulkOrderSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields",
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const data = parsed.data;
    const customerId = await getCurrentCustomerId();

    const expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;

    await prisma.bulkOrderRequest.create({
      data: {
        customerId: customerId ?? null,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        productsNote: data.productsNote,
        expectedDate:
          expectedDate && !Number.isNaN(expectedDate.getTime()) ? expectedDate : null,
        deliveryLocation: data.deliveryLocation,
        additionalNotes: data.additionalNotes || null,
        status: "PENDING",
      },
    });

    revalidatePath("/admin/bulk-orders");
    return {
      ok: true,
      message:
        "Thank you — your bulk enquiry has been received. Our team will get back to you with a quote shortly.",
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Admin: move a request through the quoting workflow. */
export async function updateBulkOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const parsed = bulkOrderUpdateSchema.safeParse({
      ...Object.fromEntries(formData),
      quotedAmount:
        String(formData.get("quotedAmount") ?? "").trim() === ""
          ? null
          : Number(formData.get("quotedAmount")),
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const { id, status, quotedAmount, additionalNotes } = parsed.data;

    if (status === "QUOTED" && (quotedAmount == null || quotedAmount <= 0)) {
      return { ok: false, fieldErrors: { quotedAmount: "Enter a quote amount before marking as quoted" } };
    }

    await prisma.bulkOrderRequest.update({
      where: { id },
      data: {
        status,
        quotedAmount: quotedAmount ?? null,
        ...(additionalNotes ? { additionalNotes } : {}),
      },
    });

    revalidatePath("/admin/bulk-orders");
    revalidatePath(`/admin/bulk-orders/${id}`);
    return { ok: true, message: "Bulk request updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
