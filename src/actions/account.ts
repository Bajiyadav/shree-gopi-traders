"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomerId } from "@/lib/auth";
import { addressSchema, fieldErrors, profileSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const customerId = await getCurrentCustomerId();
    if (!customerId) return { ok: false, error: "Please sign in" };

    const parsed = profileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: data.name,
        phone: data.phone,
        businessProfile: {
          upsert: {
            create: {
              businessName: data.businessName,
              businessType: data.businessType,
              gstNumber: data.gstNumber || null,
            },
            update: {
              businessName: data.businessName,
              businessType: data.businessType,
              gstNumber: data.gstNumber || null,
            },
          },
        },
      },
    });

    revalidatePath("/account");
    return { ok: true, message: "Profile updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function saveAddressAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const customerId = await getCurrentCustomerId();
    if (!customerId) return { ok: false, error: "Please sign in" };

    const id = String(formData.get("id") ?? "");
    const parsed = addressSchema.safeParse({
      ...Object.fromEntries(formData),
      isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    const payload = {
      label: data.label || null,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      isDefault: Boolean(data.isDefault),
    };

    await prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } });
      }
      if (id) {
        // updateMany scopes the write to this customer — an id alone is not authorization.
        const updated = await tx.address.updateMany({ where: { id, customerId }, data: payload });
        if (updated.count === 0) throw new Error("Address not found");
      } else {
        await tx.address.create({ data: { ...payload, customerId } });
      }
    });

    revalidatePath("/account");
    revalidatePath("/checkout");
    return { ok: true, message: id ? "Address updated" : "Address saved" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteAddressAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const customerId = await getCurrentCustomerId();
    if (!customerId) return { ok: false, error: "Please sign in" };
    const id = String(formData.get("id") ?? "");
    const deleted = await prisma.address.deleteMany({ where: { id, customerId } });
    if (deleted.count === 0) return { ok: false, error: "Address not found" };
    revalidatePath("/account");
    return { ok: true, message: "Address removed" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
