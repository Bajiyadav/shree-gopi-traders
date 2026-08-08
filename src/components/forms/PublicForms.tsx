"use client";

import { useFormState } from "react-dom";
import { submitBulkOrderAction } from "@/actions/bulk-orders";
import { submitContactAction } from "@/actions/contact";
import { initialActionState } from "@/actions/types";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";

export function BulkOrderForm({
  defaults,
}: {
  defaults?: { companyName?: string; contactPerson?: string; phone?: string; email?: string };
}) {
  const [state, formAction] = useFormState(submitBulkOrderAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  if (state.ok) {
    return (
      <Alert tone="success">
        <p className="font-medium">Enquiry received</p>
        <p className="mt-1">{state.message}</p>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business Name" htmlFor="companyName" error={err("companyName")} required>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={defaults?.companyName}
            autoComplete="organization"
            required
          />
        </Field>

        <Field label="Contact Person" htmlFor="contactPerson" error={err("contactPerson")} required>
          <Input
            id="contactPerson"
            name="contactPerson"
            defaultValue={defaults?.contactPerson}
            autoComplete="name"
            required
          />
        </Field>

        <Field label="Phone" htmlFor="phone" error={err("phone")} required>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults?.phone} required />
        </Field>

        <Field label="Email" htmlFor="email" error={err("email")} required>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
        </Field>

        <Field
          label="Products & Quantities"
          htmlFor="productsNote"
          error={err("productsNote")}
          hint="List the products and how many units of each you need"
          required
          className="sm:col-span-2"
        >
          <Textarea
            id="productsNote"
            name="productsNote"
            rows={5}
            placeholder={"e.g.\n50 × Professional Shampoo 1L\n30 × Conditioner 1L\n10 × Salon Styling Chair (Hydraulic)"}
            required
          />
        </Field>

        <Field label="Expected Purchase Date" htmlFor="expectedDate" error={err("expectedDate")}>
          <Input id="expectedDate" name="expectedDate" type="date" />
        </Field>

        <Field
          label="Delivery Location"
          htmlFor="deliveryLocation"
          error={err("deliveryLocation")}
          required
        >
          <Input id="deliveryLocation" name="deliveryLocation" placeholder="City, State" required />
        </Field>

        <Field
          label="Additional Requirements"
          htmlFor="additionalNotes"
          error={err("additionalNotes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="additionalNotes"
            name="additionalNotes"
            rows={3}
            placeholder="GST invoice, delivery window, brand preferences…"
          />
        </Field>
      </div>

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Submitting…">
        Request Bulk Quote
      </SubmitButton>
    </form>
  );
}

export function ContactForm() {
  const [state, formAction] = useFormState(submitContactAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  if (state.ok) {
    return (
      <Alert tone="success">
        <p className="font-medium">Message sent</p>
        <p className="mt-1">{state.message}</p>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your Name" htmlFor="name" error={err("name")} required>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>

        <Field label="Business Name" htmlFor="businessName" error={err("businessName")}>
          <Input id="businessName" name="businessName" autoComplete="organization" />
        </Field>

        <Field label="Phone" htmlFor="phone" error={err("phone")} required>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>

        <Field label="Email" htmlFor="email" error={err("email")} required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Message" htmlFor="message" error={err("message")} required className="sm:col-span-2">
          <Textarea
            id="message"
            name="message"
            rows={5}
            placeholder="How can we help your business?"
            required
          />
        </Field>
      </div>

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Sending…">
        Send Message
      </SubmitButton>
    </form>
  );
}
