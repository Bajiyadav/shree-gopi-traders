"use client";

import { updateBulkOrderAction } from "@/actions/bulk-orders";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ManagedForm } from "@/components/admin/common";
import { humanize } from "@/lib/utils";

/**
 * Client-side for the same reason as DeliveryForm: ManagedForm's children are
 * a render prop, and a function cannot cross the server/client boundary.
 * See DeliveryForm for the error this avoids.
 */
export function BulkOrderForm({
  id,
  statuses,
  status,
  quotedAmount,
  additionalNotes,
}: {
  id: string;
  statuses: readonly string[];
  status: string;
  /** Stringified by the page — a Prisma Decimal is not serialisable. */
  quotedAmount: string;
  additionalNotes: string;
}) {
  return (
    <ManagedForm action={updateBulkOrderAction} className="mt-5">
      {({ error }) => (
        <>
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status" error={error("status")} required>
              <Select id="status" name="status" defaultValue={status}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Quoted Amount (₹)" htmlFor="quotedAmount" error={error("quotedAmount")}>
              <Input
                id="quotedAmount"
                name="quotedAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={quotedAmount}
              />
            </Field>

            <Field
              label="Internal / Customer Notes"
              htmlFor="additionalNotes"
              error={error("additionalNotes")}
              className="sm:col-span-2"
            >
              <Textarea
                id="additionalNotes"
                name="additionalNotes"
                rows={4}
                defaultValue={additionalNotes}
              />
            </Field>
          </div>

          <div className="mt-4">
            <SubmitButton pendingText="Saving…">Update Request</SubmitButton>
          </div>
        </>
      )}
    </ManagedForm>
  );
}
