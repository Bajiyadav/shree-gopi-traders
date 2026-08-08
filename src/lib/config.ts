// Centralized site/brand configuration.
// Change the brand name here — never hardcode it in components/pages.

/**
 * Resolves the public origin used for canonical URLs, OpenGraph tags and the
 * sitemap.
 *
 * `NEXT_PUBLIC_*` values are inlined at BUILD time, so this must be set in the
 * hosting environment before the build runs — setting it afterwards has no
 * effect until the next deploy.
 *
 * The localhost fallback sits behind a `NODE_ENV === "development"` check on
 * purpose: NODE_ENV is inlined at build time too, so the minifier eliminates
 * that branch entirely from production bundles. Without the guard the literal
 * ships to browsers as dead code, and "localhost" showing up in a production
 * asset is the kind of thing that fails a deployment review.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      // Normalise to an origin so a trailing path or slash can't corrupt
      // every canonical URL on the site.
      return new URL(raw).origin;
    } catch {
      // Fall through — a malformed value should degrade, not crash the build.
    }
  }

  // Vercel always provides this, so a deploy that forgets the variable still
  // produces correct absolute URLs rather than localhost ones.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  // Nothing usable: callers fall back to relative URLs rather than emitting a
  // wrong absolute origin.
  return "";
}

export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Shree Gopi Traders",
  tagline: "Everything Your Salon Needs. In One Place.",
  supportingText:
    "Professional salon, parlour, beauty and spa supplies for businesses of every size.",
  announcementBar: "Professional Salon & Parlour Supplies | Bulk Orders Available",
  siteUrl: resolveSiteUrl(),
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "",
  currency: "INR",
  currencySymbol: "₹",
};

/** Absolute URL helper that degrades to a relative path when no origin is known. */
export function absoluteUrl(path: string): string {
  const base = siteConfig.siteUrl;
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
