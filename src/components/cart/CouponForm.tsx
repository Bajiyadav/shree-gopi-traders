"use client";

import { useFormState } from "react-dom";
import { applyCouponAction, removeCouponAction } from "@/actions/cart";
import { initialActionState } from "@/actions/types";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui";

export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const [state, formAction] = useFormState(applyCouponAction, initialActionState);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="text-sm">
          <span className="font-medium text-emerald-900">{appliedCode}</span>
          <span className="ml-2 text-emerald-700">applied</span>
        </div>
        <form action={removeCouponAction}>
          <button type="submit" className="text-xs font-medium text-emerald-800 underline">
            Remove
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <Input
          id="couponCode"
          name="couponCode"
          placeholder="Enter code"
          className="uppercase"
          autoComplete="off"
        />
        <SubmitButton variant="outline" pendingText="Applying…">
          Apply
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
