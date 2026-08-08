import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCartWithPricing } from "@/actions/cart";
import { getCurrentCustomerId } from "@/lib/auth";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CouponForm } from "@/components/cart/CouponForm";
import { Alert, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your salon supplies order before checkout.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const customerId = await getCurrentCustomerId();
  const cart = await getCartWithPricing();

  if (!customerId) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Your Cart" />
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Sign in to view your cart"
          description="Register your salon, parlour or beauty business to order at wholesale rates and pay cash on delivery."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/login?next=/cart">Sign In</ButtonLink>
              <ButtonLink href="/register" variant="outline">
                Register Your Business
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Your Cart" />
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Browse the catalogue and add the products your salon needs — wholesale rates apply automatically as quantity increases."
          action={<ButtonLink href="/products">Shop Products</ButtonLink>}
        />
      </div>
    );
  }

  const amountToFreeDelivery = FREE_DELIVERY_THRESHOLD - cart.subtotal;

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Your Cart"
        description={`${cart.itemCount} unit${cart.itemCount === 1 ? "" : "s"} across ${cart.items.length} product${cart.items.length === 1 ? "" : "s"}`}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {cart.hasStockIssue && (
            <Alert tone="warning" className="mb-5">
              Some items exceed the stock we currently have. Reduce those quantities to continue to
              checkout.
            </Alert>
          )}

          <Card className="divide-y divide-slate-100 px-5">
            {cart.items.map((item) => (
              <CartItemRow key={item.cartItemId} item={item} />
            ))}
          </Card>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/products" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              ← Continue shopping
            </Link>
          </div>
        </div>

        <aside>
          <Card className="sticky top-32 p-5">
            <h2 className="text-base font-semibold">Order Summary</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="font-medium text-slate-900">{formatCurrency(cart.subtotal)}</dd>
              </div>

              {cart.bulkDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Wholesale savings</dt>
                  <dd className="font-medium text-emerald-700">
                    −{formatCurrency(cart.bulkDiscount)}
                  </dd>
                </div>
              )}

              {cart.couponDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Coupon ({cart.couponCode})</dt>
                  <dd className="font-medium text-emerald-700">
                    −{formatCurrency(cart.couponDiscount)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery</dt>
                <dd className="font-medium text-slate-900">
                  {cart.deliveryFee === 0 ? (
                    <span className="text-emerald-700">Free</span>
                  ) : (
                    formatCurrency(cart.deliveryFee)
                  )}
                </dd>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-semibold text-slate-900">{formatCurrency(cart.total)}</dd>
              </div>
            </dl>

            {amountToFreeDelivery > 0 && (
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                Add {formatCurrency(amountToFreeDelivery)} more to qualify for free delivery.
              </p>
            )}

            {cart.couponError && (
              <p className="mt-3 text-xs font-medium text-amber-700">{cart.couponError}</p>
            )}

            <div className="mt-5">
              <CouponForm appliedCode={cart.couponCode} />
            </div>

            <ButtonLink
              href="/checkout"
              size="lg"
              className="mt-5 w-full"
              aria-disabled={cart.hasStockIssue}
            >
              Proceed to Checkout
            </ButtonLink>

            <p className="mt-3 text-center text-xs text-slate-500">
              Cash on Delivery · GST invoice available
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
