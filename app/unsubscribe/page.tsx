import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Stop report emails", robots: { index: false, follow: false } };

/**
 * Where the "stop these emails" link lands. Unsubscribing takes a button
 * press (a POST), so link scanners that open every URL in an email can't
 * turn reports off by themselves.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const heading = done === "1" ? "you're unsubscribed." : done === "0" ? "already stopped." : "stop report emails?";
  const lead =
    done === "1"
      ? "we won't email your portfolio report again. you can turn reports back on from your portfolio page any time."
      : done === "0"
        ? "this link has already been used, or reports were turned off. nothing more will be sent from it."
        : "we'll stop emailing your portfolio report. your account and portfolio stay as they are.";
  return (
    <div className="container-page flex min-h-[70svh] max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
      <p className="lower font-mono text-xs text-primary">▸ report emails</p>
      <h1 className="lower mt-8 font-heading text-[12vw] leading-[0.95] tracking-tight md:text-[5vw]">{heading}</h1>
      <p className="lower mt-8 max-w-md text-sm text-muted-foreground">{lead}</p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6">
        {!done && token ? (
          <form method="post" action={`/api/reports/unsubscribe?token=${encodeURIComponent(token)}`}>
            <button
              type="submit"
              className="lower rounded-full bg-primary px-5 py-2 font-mono text-xs text-primary-foreground hover:opacity-90"
            >
              stop the emails
            </button>
          </form>
        ) : null}
        <Link href="/portfolio#email-reports" className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground">
          manage reports on your portfolio ↗
        </Link>
      </div>
    </div>
  );
}
