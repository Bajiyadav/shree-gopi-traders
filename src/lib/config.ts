// Centralized site/brand configuration.
// Change the brand name here — never hardcode it in components/pages.

/**
 * A malformed NEXT_PUBLIC_SITE_URL would otherwise crash the build at
 * `new URL(...)` in the root layout's metadataBase. Fall back instead, so a
 * typo in a deploy environment degrades SEO rather than taking the site down.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  if (!raw) return fallback;
  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
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
