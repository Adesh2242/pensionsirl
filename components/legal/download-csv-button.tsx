"use client";

import { Download } from "lucide-react";
import { useState } from "react";

/**
 * "download as csv". The file is built in the browser by `onDownload`;
 * nothing is sent to a server, which the button says.
 */
export function DownloadCsvButton({
  onDownload,
  label = "download as csv",
  className = "",
}: {
  onDownload: () => void;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <button
        type="button"
        onClick={() => {
          onDownload();
          setDone(true);
        }}
        className="lower pill inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm transition-colors hover:text-primary"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      <span className="lower font-mono text-[0.7rem] text-muted-foreground">
        {done ? "saved — " : ""}made on your device, nothing is sent to us
      </span>
    </div>
  );
}
