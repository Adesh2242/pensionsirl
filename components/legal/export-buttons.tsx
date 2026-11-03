"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";

/**
 * "download pdf" and "download csv", side by side. Both files are built in
 * the browser — nothing is sent to a server — and the PDF code is only
 * loaded when someone asks for one, so it never slows the page down.
 */
export function ExportButtons({
  onPdf,
  onCsv,
}: {
  /** Builds and saves the PDF; usually a dynamic import of the report. */
  onPdf: () => Promise<void>;
  onCsv: () => void;
}) {
  const [state, setState] = useState<"idle" | "pdf" | "done" | "error">("idle");

  async function pdf() {
    setState("pdf");
    try {
      await onPdf();
      setState("done");
    } catch (error) {
      console.error("PDF export failed:", error);
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pdf}
          disabled={state === "pdf"}
          className="lower inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {state === "pdf" ? "preparing pdf…" : "download pdf report"}
        </button>
        <button
          type="button"
          onClick={() => {
            onCsv();
            setState("done");
          }}
          className="lower pill inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm transition-colors hover:text-primary"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          csv
        </button>
      </div>
      <span
        className={`lower font-mono text-[0.7rem] ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}
        role="status"
      >
        {state === "error"
          ? "couldn't make the pdf — try again, or use csv"
          : `${state === "done" ? "saved — " : ""}made on your device, nothing is sent to us`}
      </span>
    </div>
  );
}
