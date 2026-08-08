import { Badge } from "./index";
import { humanize } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const ORDER_TONES: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PROCESSING: "info",
  PACKED: "info",
  SHIPPED: "brand",
  OUT_FOR_DELIVERY: "brand",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const PAYMENT_TONES: Record<string, Tone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "info",
  COD: "neutral",
};

const DELIVERY_TONES: Record<string, Tone> = {
  PENDING: "warning",
  PACKED: "info",
  SHIPPED: "brand",
  OUT_FOR_DELIVERY: "brand",
  DELIVERED: "success",
  FAILED: "danger",
};

const BULK_TONES: Record<string, Tone> = {
  PENDING: "warning",
  REVIEWING: "info",
  QUOTED: "brand",
  APPROVED: "success",
  REJECTED: "danger",
  COMPLETED: "success",
};

const REVIEW_TONES: Record<string, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const ENQUIRY_TONES: Record<string, Tone> = {
  UNREAD: "warning",
  READ: "info",
  ARCHIVED: "neutral",
};

const MAPS = {
  order: ORDER_TONES,
  payment: PAYMENT_TONES,
  delivery: DELIVERY_TONES,
  bulk: BULK_TONES,
  review: REVIEW_TONES,
  enquiry: ENQUIRY_TONES,
};

export function StatusBadge({
  status,
  kind = "order",
}: {
  status: string;
  kind?: keyof typeof MAPS;
}) {
  return <Badge tone={MAPS[kind][status] ?? "neutral"}>{humanize(status)}</Badge>;
}

/** Derives the stock label from live stock + the variant's low-stock threshold. */
export function stockLevel(stock: number, threshold = 5) {
  if (stock <= 0) return { label: "Out of Stock", tone: "danger" as Tone };
  if (stock <= threshold) return { label: `Low Stock — ${stock} left`, tone: "warning" as Tone };
  return { label: "In Stock", tone: "success" as Tone };
}

export function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  const level = stockLevel(stock, threshold);
  return <Badge tone={level.tone}>{level.label}</Badge>;
}
