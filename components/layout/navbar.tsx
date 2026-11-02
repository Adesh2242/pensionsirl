"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Portfolio leads: it's the heart of the site. It's listed for everyone —
// logged out, it takes you to log in and then straight back to it.
const primaryLinks = [
  { href: "/portfolio", label: "my portfolio", featured: true },
  { href: "/funds", label: "funds" },
  { href: "/compare", label: "compare" },
] as const;

const secondaryLinks = [
  { href: "/calculator", label: "calculator" },
  { href: "/ai-suggestions", label: "ai" },
] as const;

const allLinks = [
  { href: "/portfolio", label: "my portfolio" },
  { href: "/", label: "home" },
  { href: "/funds", label: "funds" },
  { href: "/compare", label: "compare" },
  { href: "/calculator", label: "calculator" },
  { href: "/ai-suggestions", label: "ai suggestions" },
  { href: "/how-it-works", label: "how it works" },
] as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`lower block font-heading leading-[0.95] tracking-tight ${className}`}>
      <span className="block">pension</span>
      <span className="block text-primary">iq</span>
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Don't let the page scroll behind the open overlay.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
        <div className="mx-auto flex max-w-[1600px] justify-center">
          <div
            className={`pill flex items-center gap-5 rounded-full px-5 py-2.5 transition-all duration-500 md:gap-8 md:px-7 ${
              scrolled ? "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)]" : ""
            }`}
          >
            <nav className="hidden items-center gap-6 md:flex">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={isActive(link.href) ? "true" : undefined}
                  className={`lower link-underline text-xs transition-colors hover:text-foreground ${
                    "featured" in link
                      ? "inline-flex items-center gap-1.5 text-primary"
                      : isActive(link.href)
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {"featured" in link && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                  {link.label}
                </Link>
              ))}
            </nav>

            <Link href="/" className="shrink-0 text-center text-sm" aria-label="PensionIQ — home">
              <Wordmark />
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={isActive(link.href) ? "true" : undefined}
                  className={`lower link-underline text-xs transition-colors hover:text-foreground ${
                    isActive(link.href) ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-6 w-6 shrink-0 grid-cols-2 place-content-center gap-1"
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`block h-1 w-1 rounded-full bg-foreground transition-transform duration-500 ${
                    open ? "scale-150" : ""
                  }`}
                />
              ))}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen menu */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          className="absolute inset-0 h-full w-full cursor-default bg-background/95 backdrop-blur-xl"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
        />
        <div className="relative flex h-full flex-col justify-center px-8 md:px-16">
          <ul className="space-y-1">
            {allLinks.map((link, i) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className={`lower block font-heading text-4xl tracking-tight ${i === 0 ? "text-primary" : "text-muted-foreground"} transition-all duration-500 hover:translate-x-3 hover:text-foreground md:text-6xl`}
                  style={{
                    transitionDelay: open ? `${i * 45}ms` : "0ms",
                    opacity: open ? 1 : 0,
                    transform: open ? "none" : "translateY(18px)",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="lower mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-sm">
            {!loading && user ? (
              <>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  settings ↗
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  tabIndex={open ? 0 : -1}
                  className="lower text-muted-foreground transition-colors hover:text-primary"
                >
                  log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  log in ↗
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  create an account ↗
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
