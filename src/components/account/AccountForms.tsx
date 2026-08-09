"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  deleteAddressAction,
  saveAddressAction,
  updateProfileAction,
} from "@/actions/account";
import { initialActionState } from "@/actions/types";
import { Alert, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";

const BUSINESS_TYPES = [
  { value: "SALON", label: "Salon" },
  { value: "PARLOUR", label: "Parlour" },
  { value: "SPA", label: "Spa" },
  { value: "BEAUTY_STUDIO", label: "Beauty Studio" },
  { value: "MAKEUP_ARTIST", label: "Makeup Artist" },
  { value: "BARBERSHOP", label: "Barbershop" },
  { value: "ACADEMY", label: "Beauty Academy" },
  { value: "RETAILER", label: "Retailer" },
  { value: "OTHER", label: "Other" },
];

export interface ProfileDefaults {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  businessType: string;
}

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, formAction] = useFormState(updateProfileAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact Name" htmlFor="name" error={err("name")} required>
          <Input id="name" name="name" defaultValue={defaults.name} required />
        </Field>

        <Field label="Phone" htmlFor="phone" error={err("phone")} required>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} required />
        </Field>

        <Field label="Email" htmlFor="accountEmail" hint="Contact us to change your sign-in email">
          <Input id="accountEmail" defaultValue={defaults.email} disabled />
        </Field>

        <Field label="Business Type" htmlFor="businessType" error={err("businessType")} required>
          <Select id="businessType" name="businessType" defaultValue={defaults.businessType} required>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Business Name" htmlFor="businessName" error={err("businessName")} required>
          <Input id="businessName" name="businessName" defaultValue={defaults.businessName} required />
        </Field>
      </div>

      <SubmitButton pendingText="Saving…">Save Changes</SubmitButton>
    </form>
  );
}

export interface AddressItem {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export function AddressBook({ addresses }: { addresses: AddressItem[] }) {
  const [adding, setAdding] = useState(false);
  const [state, formAction] = useFormState(saveAddressAction, initialActionState);
  const [deleteState, deleteAction] = useFormState(deleteAddressAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <div className="space-y-4">
      <FormMessage state={state} />
      <FormMessage state={deleteState} />

      {addresses.length === 0 && !adding && (
        <Alert tone="info">
          You have no saved addresses yet. Add one to speed up checkout.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <Card key={address.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{address.label ?? "Address"}</p>
                  {address.isDefault && <Badge tone="brand">Default</Badge>}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state} — {address.pincode}
                </p>
              </div>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={address.id} />
                <button
                  type="submit"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete address"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      {adding ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold">Add a new address</h3>
          <form
            action={formAction}
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={() => setAdding(false)}
          >
            <Field label="Label" htmlFor="label" error={err("label")} hint="e.g. Salon, Warehouse">
              <Input id="label" name="label" placeholder="Salon" />
            </Field>
            <div className="hidden sm:block" />

            <Field label="Address Line 1" htmlFor="line1" error={err("line1")} required className="sm:col-span-2">
              <Input id="line1" name="line1" required />
            </Field>

            <Field label="Address Line 2" htmlFor="line2" error={err("line2")} className="sm:col-span-2">
              <Input id="line2" name="line2" />
            </Field>

            <Field label="City" htmlFor="city" error={err("city")} required>
              <Input id="city" name="city" required />
            </Field>

            <Field label="State" htmlFor="state" error={err("state")} required>
              <Input id="state" name="state" required />
            </Field>

            <Field label="Pincode" htmlFor="pincode" error={err("pincode")} required>
              <Input id="pincode" name="pincode" inputMode="numeric" maxLength={6} required />
            </Field>

            <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isDefault"
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Set as default address
            </label>

            <div className="flex gap-2 sm:col-span-2">
              <SubmitButton pendingText="Saving…">Save Address</SubmitButton>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Add Address
        </Button>
      )}
    </div>
  );
}
