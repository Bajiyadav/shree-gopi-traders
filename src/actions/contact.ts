"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/** Public: contact / enquiry form. */
export async function submitContactAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = contactSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please correct the highlighted fields",
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const data = parsed.data;

    await prisma.contactMessage.create({
      data: {
        name: data.name,
        businessName: data.businessName || null,
        phone: data.phone,
        email: data.email,
        message: data.message,
        status: "UNREAD",
      },
    });

    revalidatePath("/admin/enquiries");
    return { ok: true, message: "Thank you — we have received your message and will be in touch." };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateEnquiryStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!["UNREAD", "READ", "ARCHIVED"].includes(status)) {
      return { ok: false, error: "Invalid status" };
    }

    await prisma.contactMessage.update({
      where: { id },
      data: { status: status as "UNREAD" | "READ" | "ARCHIVED" },
    });

    revalidatePath("/admin/enquiries");
    return { ok: true, message: "Enquiry updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteEnquiryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    await prisma.contactMessage.delete({ where: { id: String(formData.get("id") ?? "") } });
    revalidatePath("/admin/enquiries");
    return { ok: true, message: "Enquiry deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
