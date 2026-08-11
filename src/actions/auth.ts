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
import {
  checkAuthRate, recordFailedAuth, clearAuthFailures, rateLimitMessage,
} from "@/lib/rate-limit";
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

  // Shares the per-address budget, so one client cannot create accounts in bulk.
  const rate = await checkAuthRate();
  if (!rate.allowed) return { ok: false, error: rateLimitMessage(rate.retryAfterMinutes) };

  const data = parsed.data;
  const existing = await prisma.customer.findUnique({ where: { email: data.email } });
  if (existing) {
    await recordFailedAuth();
    return { ok: false, fieldErrors: { email: "An account with this email already exists" } };
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
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

  const rate = await checkAuthRate(parsed.data.email);
  if (!rate.allowed) return { ok: false, error: rateLimitMessage(rate.retryAfterMinutes) };

  try {
    await customerLogin(parsed.data.email, parsed.data.password);
  } catch (err) {
    // Counted before the message goes back, so a scripted attempt is throttled
    // whether it guesses an existing address or not.
    await recordFailedAuth(parsed.data.email);
    return { ok: false, error: errorMessage(err, "Invalid email or password") };
  }
  await clearAuthFailures(parsed.data.email);

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

  const rate = await checkAuthRate(parsed.data.email);
  if (!rate.allowed) return { ok: false, error: rateLimitMessage(rate.retryAfterMinutes) };

  try {
    await adminLogin(parsed.data.email, parsed.data.password);
  } catch (err) {
    await recordFailedAuth(parsed.data.email);
    return { ok: false, error: errorMessage(err, "Invalid email or password") };
  }
  await clearAuthFailures(parsed.data.email);

  redirect("/admin/dashboard");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
