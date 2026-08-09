"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { Alert, Badge, Button } from "@/components/ui";
import { StockBadge } from "@/components/ui/status";
import { addToCart } from "@/actions/cart";
import { WhatsAppButton } from "@/components/layout/WhatsApp";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface PanelTier {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

export interface PanelVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  lowStockThreshold: number;
  tiers: PanelTier[];
}

/**
 * Mirrors the server's tier rule (`selectTier` in lib/pricing) purely so the
 * shopper can see the price move as they change quantity. The server
 * recalculates everything at add-to-cart and checkout — this is display only.
 */
function pickTier(tiers: PanelTier[], quantity: number): PanelTier | null {
  let best: PanelTier | null = null;
  for (const tier of tiers) {
    const inRange = quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty);
    if (inRange && (!best || tier.minQty > best.minQty)) best = tier;
  }
  return best;
}

export function PurchasePanel({
  variants,
  isSignedIn,
  allowBackorder,
  moq = 1,
  productName,
  sku,
}: {
  variants: PanelVariant[];
  isSignedIn: boolean;
  allowBackorder: boolean;
  /** Minimum order quantity — the quantity control starts and floors here. */
  moq?: number;
  productName: string;
  sku: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variantId, setVariantId] = useState(
    variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(Math.max(1, moq));
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];

  const pricing = useMemo(() => {
    if (!variant) return null;
    const tier = pickTier(variant.tiers, quantity);
    const unitPrice = tier ? tier.pricePerUnit : variant.salePrice ?? variant.price;
    const listPrice = variant.price;
    return {
      tier,
      unitPrice,
      listPrice,
      lineTotal: unitPrice * quantity,
      savings: Math.max(0, (listPrice - unitPrice) * quantity),
      savingsPercent: listPrice > unitPrice ? Math.round(((listPrice - unitPrice) / listPrice) * 100) : 0,
    };
  }, [variant, quantity]);

  if (!variant || !pricing) {
    return <Alert tone="warning">This product has no purchasable variants right now.</Alert>;
  }

  const maxQty = allowBackorder ? 9999 : Math.max(variant.stock, 0);
  const outOfStock = !allowBackorder && variant.stock <= 0;
  const exceedsStock = !allowBackorder && quantity > variant.stock;

  const clamp = (n: number) => Math.min(Math.max(moq, n), Math.max(moq, maxQty));

  function handleAdd(then?: "checkout") {
    setFeedback(null);
    startTransition(async () => {
      try {
        await addToCart(variantId, quantity);
        if (then === "checkout") {
          router.push("/checkout");
        } else {
          setFeedback({ tone: "success", text: "Added to your cart." });
          router.refresh();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not add to cart";
        setFeedback({ tone: "danger", text: message });
      }
    });
  }

  return (
    <div className="space-y-5" id="buy">
      {/* Price */}
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold text-slate-900">
            {formatCurrency(pricing.unitPrice)}
          </span>
          {pricing.savingsPercent > 0 && (
            <>
              <span className="text-lg text-slate-400 line-through">
                {formatCurrency(pricing.listPrice)}
              </span>
              <Badge tone="danger">{pricing.savingsPercent}% off</Badge>
            </>
          )}
          <span className="text-sm text-slate-500">per unit</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Inclusive of applicable taxes · GST invoice available at checkout
        </p>
      </div>

      {/* Variants */}
      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Variant: <span className="font-normal text-slate-600">{variant.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const disabled = !allowBackorder && v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(Math.max(1, moq));
                    setFeedback(null);
                  }}
                  disabled={disabled}
                  className={cn(
                    "relative rounded-lg border px-3.5 py-2 text-sm transition-colors",
                    v.id === variantId
                      ? "border-brand-700 bg-brand-50 font-medium text-brand-800"
                      : "border-slate-300 text-slate-700 hover:border-slate-400",
                    disabled && "cursor-not-allowed border-slate-200 text-slate-400 line-through"
                  )}
                >
                  {v.name}
                  {v.id === variantId && (
                    <Check className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-brand-700 p-0.5 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StockBadge stock={variant.stock} threshold={variant.lowStockThreshold} />
        <span className="text-slate-500">SKU: {variant.sku}</span>
      </div>

      {/* Wholesale ladder */}
      {variant.tiers.length > 1 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Wholesale pricing</p>
            <p className="text-xs text-slate-500">
              The right tier is applied automatically at checkout.
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[...variant.tiers]
                .sort((a, b) => a.minQty - b.minQty)
                .map((tier) => {
                  const active = pricing.tier?.minQty === tier.minQty;
                  return (
                    <tr key={tier.minQty} className={active ? "bg-brand-50/60" : undefined}>
                      <td className="px-4 py-2.5 text-slate-700">
                        {tier.maxQty === null
                          ? `${tier.minQty}+ units`
                          : `${tier.minQty} – ${tier.maxQty} units`}
                        {active && (
                          <span className="ml-2 text-xs font-medium text-brand-700">
                            Your price
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {formatCurrency(tier.pricePerUnit)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {tier.pricePerUnit < variant.price ? (
                          <span className="font-medium text-emerald-700">
                            Save {Math.round(((variant.price - tier.pricePerUnit) / variant.price) * 100)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quantity */}
      <div>
        <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-slate-700">
          Quantity
          <span className="ml-2 font-normal text-slate-500">
            MOQ: {moq} {moq === 1 ? "piece" : "pieces"}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => clamp(q - 1))}
              disabled={quantity <= moq}
              className="inline-flex h-10 w-10 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              id="quantity"
              type="number"
              min={moq}
              max={maxQty}
              value={quantity}
              onChange={(e) => setQuantity(clamp(Number(e.target.value) || moq))}
              className="h-10 w-16 border-x border-slate-300 text-center text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => clamp(q + 1))}
              disabled={quantity >= maxQty}
              className="inline-flex h-10 w-10 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="text-sm">
            <span className="text-slate-500">Total: </span>
            <span className="text-lg font-semibold text-slate-900">
              {formatCurrency(pricing.lineTotal)}
            </span>
            {pricing.savings > 0 && (
              <span className="ml-2 text-xs font-medium text-emerald-700">
                You save {formatCurrency(pricing.savings)}
              </span>
            )}
          </div>
        </div>

        {/* Nudge toward the next tier — this is how B2B carts grow. */}
        {(() => {
          const next = [...variant.tiers]
            .sort((a, b) => a.minQty - b.minQty)
            .find((t) => t.minQty > quantity);
          if (!next || next.pricePerUnit >= pricing.unitPrice) return null;
          return (
            <p className="mt-2 text-xs text-brand-700">
              Add {next.minQty - quantity} more to get {formatCurrency(next.pricePerUnit)} per unit.
            </p>
          );
        })()}
      </div>

      {exceedsStock && (
        <Alert tone="warning">
          Only {variant.stock} unit{variant.stock === 1 ? "" : "s"} available for this variant.
        </Alert>
      )}

      {feedback && <Alert tone={feedback.tone === "success" ? "success" : "danger"}>{feedback.text}</Alert>}

      {!isSignedIn && (
        <Alert tone="info">
          <a href="/login" className="font-medium underline">
            Sign in
          </a>{" "}
          or{" "}
          <a href="/register" className="font-medium underline">
            register your business
          </a>{" "}
          to add items to your cart and see your wholesale rates at checkout.
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={() => handleAdd()}
          disabled={pending || outOfStock || exceedsStock}
          className="flex-1"
          size="lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? "Out of Stock" : pending ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => handleAdd("checkout")}
          disabled={pending || outOfStock || exceedsStock}
          className="flex-1"
        >
          Buy Now
        </Button>
      </div>

      {/* Many B2B buyers would rather confirm a bulk order over chat than
          complete a checkout form. The message carries the exact SKU,
          variant and quantity so nothing is retyped. */}
      <WhatsAppButton
        className="w-full"
        message={
          `Hello, I'd like to order:\n\n` +
          `${productName}\n` +
          `Variant: ${variant.name}\n` +
          `SKU: ${variant.sku}\n` +
          `Quantity: ${quantity}\n` +
          `Rate: ${formatCurrency(pricing.unitPrice)} per unit\n` +
          `Total: ${formatCurrency(pricing.lineTotal)}`
        }
      >
        Order on WhatsApp
      </WhatsAppButton>
    </div>
  );
}
