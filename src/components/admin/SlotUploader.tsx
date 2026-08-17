"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { uploadProductImageAction, removeProductImageAction } from "@/actions/media";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/media-constants";
import { cn } from "@/lib/utils";

const initial = { ok: false } as const;

/** Submits as soon as a file is chosen — no separate "upload" click. */
function AutoSubmit({ hasImage }: { hasImage: boolean }) {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        pending
          ? "cursor-wait bg-slate-100 text-slate-400"
          : "bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Upload className="h-3 w-3" aria-hidden="true" />
      )}
      {pending ? "Uploading…" : hasImage ? "Replace" : "Upload"}
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </label>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-wait"
      aria-label="Remove this view"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </button>
  );
}

export function SlotUploader({
  productId,
  slot,
  hasImage,
  onDone,
}: {
  productId: string;
  slot: number;
  hasImage: boolean;
  onDone?: (message: string, ok: boolean) => void;
}) {
  const [uploadState, uploadAction] = useFormState(uploadProductImageAction, initial);
  const [removeState, removeAction] = useFormState(removeProductImageAction, initial);

  useEffect(() => {
    const s = uploadState.ok ? uploadState : removeState.ok ? removeState : null;
    const err = uploadState.error || removeState.error;
    if (s?.message) onDone?.(s.message, true);
    else if (err) onDone?.(err, false);
    // Report only when a result actually lands.
  }, [uploadState, removeState, onDone]);

  return (
    <div className="flex items-center gap-1">
      <form action={uploadAction}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="slot" value={slot} />
        <AutoSubmit hasImage={hasImage} />
      </form>

      {hasImage && (
        <form action={removeAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="slot" value={slot} />
          <RemoveButton />
        </form>
      )}
    </div>
  );
}
