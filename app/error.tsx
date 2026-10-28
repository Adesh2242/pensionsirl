"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
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
    <div className="container-page flex min-h-[70svh] max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
      <p className="lower font-mono text-xs text-destructive">▸ error</p>
      <h1 className="lower mt-8 font-heading text-[12vw] leading-[0.95] tracking-tight md:text-[5vw]">
        something
        <span className="block pl-[12%]">went wrong.</span>
      </h1>
      <p className="lower mt-8 max-w-md text-sm text-muted-foreground">
        this page hit an unexpected error. you can try again, or head back home.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6">
        <button
          onClick={() => reset()}
          className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary"
        >
          try again <span aria-hidden>↗</span>
        </button>
        <Link href="/" className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground">
          go home ↗
        </Link>
      </div>
    </div>
  );
}
