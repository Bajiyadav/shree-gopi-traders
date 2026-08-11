"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginCustomerAction, registerCustomerAction } from "@/actions/auth";
import { initialActionState } from "@/actions/types";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "./PasswordInput";

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

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(loginCustomerAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Email" htmlFor="email" error={err("email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Password" htmlFor="password" error={err("password")} required>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign In
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        New to us?{" "}
        {/* Carry ?next across, so a shopper sent here from a product page still
            lands back on it after registering instead. */}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Register your business
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(registerCustomerAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business Name" htmlFor="businessName" error={err("businessName")} required>
          <Input id="businessName" name="businessName" autoComplete="organization" required />
        </Field>

        <Field label="Business Type" htmlFor="businessType" error={err("businessType")} required>
          <Select id="businessType" name="businessType" defaultValue="SALON" required>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Contact Person / Your Name" htmlFor="name" error={err("name")} className="sm:col-span-2">
          <Input id="name" name="name" autoComplete="name" placeholder="e.g. Ramesh Kumar (Optional)" />
        </Field>

        <Field label="Email" htmlFor="email" error={err("email")} required className="sm:col-span-2">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={err("password")}
          hint="At least 8 characters"
          required
          className="sm:col-span-2"
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>

      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        Create Business Account
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
