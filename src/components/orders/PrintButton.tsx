"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Printing is the download path too: every browser's print dialog offers
 * "Save as PDF", which produces a proper A4 file without shipping a headless
 * browser into the serverless bundle just to render one page.
 */
export function PrintButton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print / Save as PDF
      </Button>
      <span className="text-xs text-slate-500">
        Choose &ldquo;Save as PDF&rdquo; in the print dialog to download.
      </span>
    </div>
  );
}
