"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  adminLogin,
  clearAdminSession,
  clearCustomerSession,
  createCustomerSession,
  customerLogin,
  hashPassword,
} from "@/lib/auth";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/** Only allow same-origin relative paths as a post-login redirect target. */
function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const value = typeof next === "string" ? next : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

export async function registerCustomerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const data = parsed.data;
  const existing = await prisma.customer.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, fieldErrors: { email: "An account with this email already exists" } };
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      businessProfile: {
        create: {
          businessName: data.businessName,
          businessType: data.businessType,
          gstNumber: data.gstNumber || null,
        },
      },
    },
  });

  await createCustomerSession(customer.id);
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function loginCustomerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  try {
    await customerLogin(parsed.data.email, parsed.data.password);
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Invalid email or password") };
  }

  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logoutCustomerAction() {
  await clearCustomerSession();
  revalidatePath("/");
  redirect("/");
}

export async function adminLoginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  try {
    await adminLogin(parsed.data.email, parsed.data.password);
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Invalid email or password") };
  }

  redirect("/admin/dashboard");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
