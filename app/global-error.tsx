"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-IE">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <p className="text-sm font-medium text-neutral-500">Error</p>
        <h1 className="text-2xl font-semibold">PensionIQ hit an unexpected error</h1>
        <p className="text-neutral-500">Please try again in a moment.</p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
