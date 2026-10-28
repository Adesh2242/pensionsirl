import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70svh] max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
      <p className="lower font-mono text-xs text-primary">▸ 404</p>
      <h1 className="lower mt-8 font-heading text-[12vw] leading-[0.95] tracking-tight md:text-[5vw]">
        that page
        <span className="block pl-[12%]">isn&apos;t here.</span>
      </h1>
      <p className="lower mt-8 max-w-md text-sm text-muted-foreground">
        the link may be old, or the fund may have been renamed by its provider.
      </p>
      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
        <Link href="/" className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground">
          go home ↗
        </Link>
        <Link href="/funds" className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground">
          browse all funds ↗
        </Link>
      </div>
    </div>
  );
}
