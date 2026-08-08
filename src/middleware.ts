import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge guard for /admin/*.
 *
 * This only proves the session cookie carries a valid signature — it cannot
 * reach the database from the edge runtime. Every admin page and admin server
 * action additionally calls `requireAdmin()` / `requireAdminAction()`, which
 * re-reads the admin row, so a deleted account is locked out immediately.
 * Treat this as a fast redirect, never as the authorization boundary.
 */

const ADMIN_COOKIE = "sgt_admin_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === "production") return null;
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-now");
  }
  return new TextEncoder().encode(value);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const key = secret();
    const token = req.cookies.get(ADMIN_COOKIE)?.value;

    if (!key || !token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    try {
      const { payload } = await jwtVerify(token, key);
      if (!payload.adminId) throw new Error("Missing admin claim");
    } catch {
      const response = NextResponse.redirect(new URL("/admin/login", req.url));
      response.cookies.delete(ADMIN_COOKIE); // clear the stale/forged cookie
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
