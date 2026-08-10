"use client";

import { updateDeliveryAction } from "@/actions/delivery";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ManagedForm } from "@/components/admin/common";
import { humanize } from "@/lib/utils";

/**
 * ManagedForm takes its children as a render prop, and it is a Client
 * Component. A Server Component cannot pass a function across that boundary —
 * React throws "Functions cannot be passed directly to Client Components" and
 * the whole route 500s. So the form lives here, in a client component, and the
 * page hands it plain serialisable values.
 */
export function DeliveryForm({
  orderId,
  statuses,
  status,
  courierName,
  trackingNumber,
  expectedDeliveryDate,
  deliveryNotes,
}: {
  orderId: string;
  statuses: readonly string[];
  status: string;
  courierName: string;
  trackingNumber: string;
  /** Already formatted as yyyy-mm-dd by the page — a Date would not serialise
   *  cleanly into a date input's defaultValue. */
  expectedDeliveryDate: string;
  deliveryNotes: string;
}) {
  return (
    <ManagedForm action={updateDeliveryAction} className="mt-5">
      {({ error }) => (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery Status" htmlFor="status" error={error("status")} required>
              <Select id="status" name="status" defaultValue={status}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Courier" htmlFor="courierName" error={error("courierName")}>
              <Input
                id="courierName"
                name="courierName"
                defaultValue={courierName}
                placeholder="Delhivery, BlueDart…"
              />
            </Field>

            <Field label="Tracking Number" htmlFor="trackingNumber" error={error("trackingNumber")}>
              <Input id="trackingNumber" name="trackingNumber" defaultValue={trackingNumber} />
            </Field>

            <Field
              label="Expected Delivery"
              htmlFor="expectedDeliveryDate"
              error={error("expectedDeliveryDate")}
            >
              <Input
                id="expectedDeliveryDate"
                name="expectedDeliveryDate"
                type="date"
                defaultValue={expectedDeliveryDate}
              />
            </Field>

            <Field
              label="Delivery Notes"
              htmlFor="deliveryNotes"
              error={error("deliveryNotes")}
              className="sm:col-span-2"
            >
              <Textarea id="deliveryNotes" name="deliveryNotes" rows={2} defaultValue={deliveryNotes} />
            </Field>
          </div>
          <div className="mt-4">
            <SubmitButton pendingText="Saving…">Update Delivery</SubmitButton>
          </div>
        </>
      )}
    </ManagedForm>
  );
}
