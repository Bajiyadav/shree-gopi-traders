"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { Banknote } from "lucide-react";
import { placeOrderAction, type PlaceOrderResult } from "@/actions/orders";
import { Alert, Card, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import type { CartSummary } from "@/actions/cart";
import { formatCurrency } from "@/lib/utils";

export interface CheckoutDefaults {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  gstNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const initial: PlaceOrderResult = { ok: false };

export function CheckoutForm({
  cart,
  defaults,
}: {
  cart: CartSummary;
  defaults: CheckoutDefaults;
}) {
  const [state, formAction] = useFormState(placeOrderAction, initial);
  const router = useRouter();

  // On success the server hands back the new order id — go straight to it.
  useEffect(() => {
    if (state.ok && state.orderId) {
      router.replace(`/orders/${state.orderId}?placed=1`);
    }
  }, [state, router]);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {state.error && <Alert tone="danger">{state.error}</Alert>}

        <Card className="p-5">
          <h2 className="text-base font-semibold">Business Details</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Used on your invoice and for delivery coordination.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" htmlFor="businessName" error={err("businessName")} required>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={defaults.businessName}
                autoComplete="organization"
                required
              />
            </Field>

            <Field label="Contact Name" htmlFor="contactName" error={err("contactName")} required>
              <Input
                id="contactName"
                name="contactName"
                defaultValue={defaults.contactName}
                autoComplete="name"
                required
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={err("phone")} required>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={defaults.phone}
                autoComplete="tel"
                required
              />
            </Field>

            <Field label="Email" htmlFor="email" error={err("email")} required>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaults.email}
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="GST Number"
              htmlFor="gstNumber"
              error={err("gstNumber")}
              hint="Optional — add it to claim input credit"
              className="sm:col-span-2"
            >
              <Input
                id="gstNumber"
                name="gstNumber"
                defaultValue={defaults.gstNumber}
                placeholder="15-character GSTIN"
                className="uppercase"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Delivery Address</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Address Line 1"
              htmlFor="line1"
              error={err("line1")}
              required
              className="sm:col-span-2"
            >
              <Input
                id="line1"
                name="line1"
                defaultValue={defaults.line1}
                autoComplete="address-line1"
                required
              />
            </Field>

            <Field label="Address Line 2" htmlFor="line2" error={err("line2")} className="sm:col-span-2">
              <Input
                id="line2"
                name="line2"
                defaultValue={defaults.line2}
                autoComplete="address-line2"
              />
            </Field>

            <Field label="City" htmlFor="city" error={err("city")} required>
              <Input id="city" name="city" defaultValue={defaults.city} autoComplete="address-level2" required />
            </Field>

            <Field label="State" htmlFor="state" error={err("state")} required>
              <Input id="state" name="state" defaultValue={defaults.state} autoComplete="address-level1" required />
            </Field>

            <Field label="Pincode" htmlFor="pincode" error={err("pincode")} required>
              <Input
                id="pincode"
                name="pincode"
                inputMode="numeric"
                maxLength={6}
                defaultValue={defaults.pincode}
                autoComplete="postal-code"
                required
              />
            </Field>

            <Field
              label="Delivery Instructions"
              htmlFor="deliveryInstructions"
              error={err("deliveryInstructions")}
              hint="Landmark, preferred delivery window, etc."
              className="sm:col-span-2"
            >
              <Textarea id="deliveryInstructions" name="deliveryInstructions" rows={3} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Payment Method</h2>
          <div className="mt-4 flex items-start gap-3 rounded-lg border-2 border-brand-600 bg-brand-50 p-4">
            <input
              type="radio"
              id="cod"
              name="paymentMethod"
              value="COD"
              defaultChecked
              className="mt-1 h-4 w-4 text-brand-700 focus:ring-brand-600"
            />
            <label htmlFor="cod" className="flex-1 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Banknote className="h-4 w-4 text-brand-700" aria-hidden="true" />
                Cash on Delivery
              </span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Pay the delivery partner in cash when your stock arrives.
              </span>
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Online payment (UPI / cards) is coming soon.
          </p>
        </Card>
      </div>

      {/* Order summary — the figures shown here are recalculated on the
          server when the order is placed, so they cannot be tampered with. */}
      <aside>
        <Card className="sticky top-32 p-5">
          <h2 className="text-base font-semibold">Order Summary</h2>

          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <li key={item.cartItemId} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">
                    {item.variantName} × {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatCurrency(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium">{formatCurrency(cart.subtotal)}</dd>
            </div>
            {cart.bulkDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Wholesale savings</dt>
                <dd className="font-medium text-emerald-700">−{formatCurrency(cart.bulkDiscount)}</dd>
              </div>
            )}
            {cart.couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Coupon ({cart.couponCode})</dt>
                <dd className="font-medium text-emerald-700">−{formatCurrency(cart.couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd className="font-medium">
                {cart.deliveryFee === 0 ? (
                  <span className="text-emerald-700">Free</span>
                ) : (
                  formatCurrency(cart.deliveryFee)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold">Total Payable</dt>
              <dd className="font-semibold">{formatCurrency(cart.total)}</dd>
            </div>
          </dl>

          {cart.couponCode && <input type="hidden" name="couponCode" value={cart.couponCode} />}

          <SubmitButton size="lg" className="mt-5 w-full" pendingText="Placing order…">
            Place Order (COD)
          </SubmitButton>

          <p className="mt-3 text-center text-xs text-slate-500">
            By placing this order you agree to pay {formatCurrency(cart.total)} on delivery.
          </p>
        </Card>
      </aside>
    </form>
  );
}
