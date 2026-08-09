"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";

/**
 * A password field with a reveal toggle.
 *
 * Typing a password blind on a phone keyboard is where most failed sign-ins
 * come from, and this store's buyers are mostly on phones. The toggle is a
 * button rather than a checkbox so it does not participate in form submission,
 * and it reports its state through aria-pressed for screen readers.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
