"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { Alert, buttonClass } from "./index";
import type { ActionState } from "@/actions/types";
import { cn } from "@/lib/utils";

/**
 * Submit button that disables itself and shows progress while the
 * enclosing server action is in flight.
 */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Renders the success/error banner returned by a server action. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.error) {
    return (
      <Alert tone="danger" className={className}>
        {state.error}
      </Alert>
    );
  }
  if (state.ok && state.message) {
    return (
      <Alert tone="success" className={className}>
        {state.message}
      </Alert>
    );
  }
  return null;
}

/** A form row that submits on change — used for filter/status dropdowns. */
export function AutoSubmit({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("contents", className)}
      onChange={(e) => {
        const target = e.target as HTMLElement;
        target.closest("form")?.requestSubmit();
      }}
    >
      {children}
    </div>
  );
}
