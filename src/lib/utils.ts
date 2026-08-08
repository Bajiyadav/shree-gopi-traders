import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { siteConfig } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as Indian Rupees, e.g. 1234.5 → "₹1,234.50". */
export function formatCurrency(value: number | string, opts?: { decimals?: boolean }) {
  const n = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  return `${siteConfig.currencySymbol}${safe.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals === false ? 0 : 2,
    maximumFractionDigits: opts?.decimals === false ? 0 : 2,
  })}`;
}

/** Compact currency for dashboard cards: ₹1.2L / ₹3.4Cr etc. */
export function formatCompactCurrency(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 10000000) return `${siteConfig.currencySymbol}${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `${siteConfig.currencySymbol}${(n / 100000).toFixed(2)}L`;
  return formatCurrency(n, { decimals: false });
}

export function formatNumber(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString("en-IN");
}

export function formatDate(date: Date | string, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Converts arbitrary text to a URL-safe slug. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Human label for enum-ish values: OUT_FOR_DELIVERY → "Out For Delivery". */
export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function discountPercent(list: number, sale: number) {
  if (!list || sale >= list) return 0;
  return Math.round(((list - sale) / list) * 100);
}

/** Builds a wa.me link with a prefilled message. */
export function whatsappLink(message?: string) {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}

/** Narrow an unknown thrown value to a user-safe message. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
