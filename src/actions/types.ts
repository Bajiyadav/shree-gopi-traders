/** Shared shape returned by every form-backed server action. */
export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };
