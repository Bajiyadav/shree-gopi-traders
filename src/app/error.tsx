"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the hosting provider's logs; the digest is what ties a
    // user report back to the server-side stack trace.
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Error</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        We hit an unexpected problem loading this page. Please try again — if it keeps happening,
        get in touch and we will sort it out.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to Home
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
