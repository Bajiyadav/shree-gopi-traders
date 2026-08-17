"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItem, updateCartItemQuantity } from "@/actions/cart";
import type { CartLine } from "@/actions/cart";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export function CartItemRow({ item }: { item: CartLine }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // These previously discarded the result, so dropping below the minimum order
  // quantity simply did nothing and left the shopper guessing why.
  const change = (quantity: number) => {
    setError(null);
    startTransition(async () => {
      const result = await updateCartItemQuantity(item.cartItemId, quantity);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeCartItem(item.cartItemId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="py-5" aria-busy={pending}>
      <div className="flex gap-4">
      <Link
        href={`/products/${item.productSlug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:h-24 sm:w-24"
      >
        <Image
          src={item.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"}
          alt={item.productName}
          fill
          sizes="96px"
          className="object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${item.productSlug}`}
              className="text-sm font-medium text-slate-900 hover:text-brand-700"
            >
              {item.productName}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">Variant: {item.variantName}</p>
            {item.tierApplied && item.tierApplied.minQty > 1 && (
              <div className="mt-1.5">
                <Badge tone="brand">
                  Wholesale tier {item.tierApplied.minQty}
                  {item.tierApplied.maxQty ? `–${item.tierApplied.maxQty}` : "+"} applied
                </Badge>
              </div>
            )}
            {!item.inStock && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                Only {item.availableStock} in stock — reduce the quantity to continue.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remove ${item.productName} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => change(item.quantity - 1)}
              disabled={pending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-11 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
            <button
              type="button"
              onClick={() => change(item.quantity + 1)}
              disabled={pending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(item.unitPrice)} / unit
              {item.savings > 0 && (
                <span className="ml-1.5 font-medium text-emerald-700">
                  saved {formatCurrency(item.savings)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
