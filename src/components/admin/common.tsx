"use client";

import { useFormState } from "react-dom";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { ActionState } from "@/actions/types";
import { initialActionState } from "@/actions/types";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { humanize } from "@/lib/utils";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A one-shot action button (activate, delete, approve…) with its own
 * feedback banner. Optionally guards behind a confirm dialog.
 */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  confirm?: string;
  variant?: Parameters<typeof SubmitButton>[0]["variant"];
  size?: Parameters<typeof SubmitButton>[0]["size"];
  className?: string;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size} className={className}>
        {children}
      </SubmitButton>
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  );
}

/** Inline "change status" dropdown that submits on selection. */
export function StatusSelect({
  action,
  fields,
  name,
  options,
  current,
  label,
}: {
  action: Action;
  fields: Record<string, string>;
  name: string;
  options: readonly string[];
  current: string;
  label?: string;
}) {
  const [state, formAction] = useFormState(action, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
      <select
        name={name}
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input-base py-1.5 text-xs"
        aria-label={label ?? "Change status"}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {state.ok && state.message && (
        <span className="text-xs font-medium text-emerald-700">{state.message}</span>
      )}
    </form>
  );
}

/** Form wrapper that renders the action's success/error banner above it. */
export function ManagedForm({
  action,
  children,
  className,
  onSuccessReset,
}: {
  action: Action;
  children: (helpers: { error: (field: string) => string | undefined; state: ActionState }) => ReactNode;
  className?: string;
  onSuccessReset?: boolean;
}) {
  const [state, formAction] = useFormState(action, initialActionState);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <form
      action={formAction}
      className={className}
      key={onSuccessReset && state.ok ? `reset-${state.message}` : undefined}
    >
      <FormMessage state={state} className="mb-4" />
      {children({ error, state })}
    </form>
  );
}

/** Search + filter toolbar. Plain GET form, so filters live in the URL. */
export function Toolbar({
  action,
  searchName = "q",
  searchValue,
  searchPlaceholder = "Search…",
  children,
}: {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-end gap-3">
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name={searchName}
          defaultValue={searchValue}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="input-base pl-9"
        />
      </div>
      {children}
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Apply
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
  placeholder,
  label,
}: {
  name: string;
  value?: string;
  options: readonly string[];
  placeholder: string;
  label?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="input-base w-auto min-w-40"
      aria-label={label ?? placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {humanize(option)}
        </option>
      ))}
    </select>
  );
}
