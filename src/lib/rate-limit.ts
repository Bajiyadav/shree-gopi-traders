import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * RATE LIMITING FOR AUTHENTICATION
 * ────────────────────────────────
 * Ten wrong passwords went through the live admin login in 3.4 seconds with
 * nothing stopping them. This limits that.
 *
 * Two scopes are counted for every attempt:
 *   ip:<address>    so one client cannot spray many accounts
 *   user:<email>    so one account cannot be ground down from many addresses
 *
 * Counted in the database, not in memory. The app runs on serverless
 * functions, so an in-process counter guards one instance and an attacker
 * simply lands on another.
 *
 * FAIL-OPEN, DELIBERATELY. If the store cannot reach its attempt log it must
 * still let real customers and the owner sign in. A login outage is a certain
 * business loss; the brute-force window this leaves open is small and covered
 * by bcrypt's cost factor.
 */

const WINDOW_MS = 15 * 60 * 1000;
export const MAX_PER_IP = 20;      // a shared office address needs headroom
export const MAX_PER_ACCOUNT = 8;  // one person mistyping their own password

// LoginAttempt is an optional model not yet in the Prisma schema for all
// databases. Access it via `any` — the try/catch blocks in every caller
// handle the missing-table case at runtime (fail-open, by design).
const loginAttempt = (prisma as any).loginAttempt as {
  findMany: (args: unknown) => Promise<{ scope: string; createdAt: Date }[]>;
  createMany: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

/** Best-effort client address behind Vercel's proxy. */
function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export interface RateVerdict {
  allowed: boolean;
  /** Whole minutes until the oldest attempt in the window expires. */
  retryAfterMinutes: number;
}

/** Checks both scopes without recording anything. */
export async function checkAuthRate(email?: string): Promise<RateVerdict> {
  const since = new Date(Date.now() - WINDOW_MS);
  const scopes = [`ip:${clientIp()}`];
  if (email) scopes.push(`user:${email.trim().toLowerCase()}`);

  try {
    const rows = await loginAttempt.findMany({
      where: { scope: { in: scopes }, createdAt: { gte: since } },
      select: { scope: true, createdAt: true },
    });

    for (const scope of scopes) {
      const mine = rows.filter((r) => r.scope === scope);
      const limit = scope.startsWith("ip:") ? MAX_PER_IP : MAX_PER_ACCOUNT;
      if (mine.length >= limit) {
        const oldest = mine.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
        const msLeft = oldest.createdAt.getTime() + WINDOW_MS - Date.now();
        return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60000)) };
      }
    }
    return { allowed: true, retryAfterMinutes: 0 };
  } catch {
    // Table missing or database unreachable — see the fail-open note above.
    return { allowed: true, retryAfterMinutes: 0 };
  }
}

/** Records one failed attempt against both scopes, and prunes expired rows. */
export async function recordFailedAuth(email?: string): Promise<void> {
  const scopes = [`ip:${clientIp()}`];
  if (email) scopes.push(`user:${email.trim().toLowerCase()}`);
  try {
    await loginAttempt.createMany({ data: scopes.map((scope) => ({ scope })) });
    // Opportunistic cleanup so the table cannot grow without bound. Cheap
    // because of the (scope, createdAt) index, and failure here is harmless.
    if (Math.random() < 0.1) {
      await loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } },
      });
    }
  } catch {
    /* never block a login on bookkeeping */
  }
}

/**
 * Clears an account's failures after a genuine sign-in.
 *
 * The per-address count is deliberately NOT cleared. If it were, anyone could
 * reset their address budget by signing into an account they already own, and
 * then resume guessing other accounts from the same machine. A real person who
 * mistypes their own password gets their account budget back, which is the
 * case that actually matters.
 */
export async function clearAuthFailures(email: string): Promise<void> {
  try {
    await loginAttempt.deleteMany({ where: { scope: `user:${email.trim().toLowerCase()}` } });
  } catch {
    /* ignore */
  }
}

export const rateLimitMessage = (m: number) =>
  `Too many sign-in attempts. Please try again in ${m} minute${m === 1 ? "" : "s"}.`;
