"use client";

import { useFormState } from "react-dom";
import { cancelMyOrderAction } from "@/actions/orders";
import { initialActionState } from "@/actions/types";
import { FormMessage, SubmitButton } from "@/components/ui/form";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction] = useFormState(cancelMyOrderAction, initialActionState);

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Cancel this order? The reserved stock will be released.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <FormMessage state={state} className="mb-3" />
      <SubmitButton variant="outline" size="sm" pendingText="Cancelling…">
        Cancel Order
      </SubmitButton>
    </form>
  );
}
