import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

/**
 * Minimal, dependency-light session auth using signed HTTP-only cookies.
 * Swap for NextAuth/Auth.js later if multi-provider login is needed —
 * the getCurrentCustomerId/requireAdmin interface would stay the same.
 *
 * The JWT is *signed*, not encrypted: it carries only an opaque id, never
 * a password, email, or role-bearing claim that isn't re-checked against
 * the database on privileged paths.
 */

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short. Set a 32+ character secret in your environment."
      );
    }
    // Development-only fallback so a fresh clone boots before .env is filled in.
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-now");
  }
  return new TextEncoder().encode(secret);
}

export const CUSTOMER_COOKIE = "sgt_customer_session";
export const ADMIN_COOKIE = "sgt_admin_session";

const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 hours — admin sessions expire sooner

async function sign(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ── Customer session ──────────────────────────────────────────

export async function createCustomerSession(customerId: string) {
  const token = await sign({ customerId }, "30d");
  cookies().set(CUSTOMER_COOKIE, token, cookieOptions(CUSTOMER_MAX_AGE));
}

export async function getCurrentCustomerId(): Promise<string | null> {
  const token = cookies().get(CUSTOMER_COOKIE)?.value;
  const payload = await verify(token);
  const id = payload?.customerId;
  return typeof id === "string" ? id : null;
}

export async function getCurrentCustomer() {
  const customerId = await getCurrentCustomerId();
  if (!customerId) return null;
  return prisma.customer.findUnique({
    where: { id: customerId },
    include: { businessProfile: true },
  });
}

/** Server-side guard for customer-only pages. Redirects to /login when signed out. */
export async function requireCustomer(returnTo?: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return customer;
}

export async function clearCustomerSession() {
  cookies().delete(CUSTOMER_COOKIE);
}

export async function customerLogin(email: string, password: string) {
  const customer = await prisma.customer.findUnique({ where: { email } });
  // Always run a comparison so a missing account and a wrong password take
  // a similar amount of time (no user enumeration through response timing).
  const hash = customer?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const valid = await verifyPassword(password, hash);
  if (!customer || !valid) throw new Error("Invalid email or password");
  await createCustomerSession(customer.id);
  return customer;
}

// ── Admin session ─────────────────────────────────────────────

export async function createAdminSession(adminId: string) {
  const token = await sign({ adminId }, "8h");
  cookies().set(ADMIN_COOKIE, token, cookieOptions(ADMIN_MAX_AGE));
}

export async function getCurrentAdminId(): Promise<string | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const payload = await verify(token);
  const id = payload?.adminId;
  return typeof id === "string" ? id : null;
}

export async function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

/**
 * Authorization gate for every admin page and admin server action.
 * The middleware only checks that a signature is valid; this re-reads the
 * admin row so a deleted/revoked admin loses access immediately.
 */
export async function requireAdmin() {
  const adminId = await getCurrentAdminId();
  if (!adminId) redirect("/admin/login");
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Same check for server actions, where a thrown error is better than a redirect. */
export async function requireAdminAction() {
  const adminId = await getCurrentAdminId();
  if (!adminId) throw new Error("Unauthorized");
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

export async function adminLogin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  const hash = admin?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const valid = await verifyPassword(password, hash);
  if (!admin || !valid) throw new Error("Invalid email or password");
  await createAdminSession(admin.id);
  return admin;
}
