import { Check, X } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { cn, formatDate } from "@/lib/utils";

/** The happy path a B2B order walks through, in order. */
const STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: "PENDING", label: "Order Placed", description: "We have received your order" },
  { status: "CONFIRMED", label: "Confirmed", description: "Order verified by our team" },
  { status: "PROCESSING", label: "Processing", description: "Items being picked from stock" },
  { status: "PACKED", label: "Packed", description: "Your order is packed and ready" },
  { status: "SHIPPED", label: "Shipped", description: "Handed over to the courier" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", description: "Arriving today" },
  { status: "DELIVERED", label: "Delivered", description: "Order completed" },
];

export function OrderTimeline({
  status,
  placedAt,
  updatedAt,
}: {
  status: OrderStatus;
  placedAt: Date;
  updatedAt: Date;
}) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
          <X className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-red-900">Order Cancelled</p>
          <p className="mt-0.5 text-xs text-red-700">
            Cancelled on {formatDate(updatedAt, true)}. Any reserved stock has been released.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="relative">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const isLast = index === STEPS.length - 1;

        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5",
                  index < currentIndex ? "bg-brand-600" : "bg-slate-200"
                )}
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                done
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-400"
              )}
            >
              {done ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
              )}
            </span>

            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  current ? "text-brand-800" : done ? "text-slate-900" : "text-slate-500"
                )}
              >
                {step.label}
                {current && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                    Current
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {index === 0 ? formatDate(placedAt, true) : step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
