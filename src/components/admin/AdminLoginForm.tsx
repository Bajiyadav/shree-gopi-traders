"use client";

import { useFormState } from "react-dom";
import { adminLoginAction } from "@/actions/auth";
import { initialActionState } from "@/actions/types";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";

export function AdminLoginForm() {
  const [state, formAction] = useFormState(adminLoginAction, initialActionState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Email" htmlFor="email" error={err("email")} required>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>

      <Field label="Password" htmlFor="password" error={err("password")} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign In
      </SubmitButton>
    </form>
  );
}
