"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clearAdminSession, hashPassword, requireAdminAction, verifyPassword } from "@/lib/auth";
import { adminPasswordSchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

export async function updateAdminProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdminAction();
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) return { ok: false, fieldErrors: { name: "Name is required" } };

    await prisma.admin.update({ where: { id: admin.id }, data: { name } });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Profile updated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Changing the admin password requires the current one, and ends the
 * session afterwards so the next sign-in uses the new credential.
 */
export async function changeAdminPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdminAction();
    const parsed = adminPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

    const valid = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
    if (!valid) return { ok: false, fieldErrors: { currentPassword: "Current password is incorrect" } };

    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    await clearAdminSession();
    return { ok: true, message: "Password changed. Please sign in again." };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
