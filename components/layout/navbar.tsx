"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, PiggyBank, Settings, Wallet } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const links = [
  { href: "/funds", label: "Funds" },
  { href: "/compare", label: "Compare" },
  { href: "/calculator", label: "Calculator" },
  { href: "/ai-suggestions", label: "AI Suggestions" },
  { href: "/how-it-works", label: "How it Works" },
];

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <PiggyBank className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="text-[0.975rem] font-semibold tracking-tight">PensionIQ</span>
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // The header starts flush with the hero and only grows a border/shadow once
  // content is scrolling underneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initial = (user?.name ?? user?.email ?? "?")[0]?.toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-shadow duration-200",
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65",
        scrolled ? "border-b shadow-soft" : "border-b border-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {!loading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="sm" className="gap-2 pl-1" />}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[12ch] truncate">{user.name ?? user.email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem render={<Link href="/portfolio" />}>
                    <Wallet className="h-4 w-4" aria-hidden />
                    My portfolio
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="h-4 w-4" aria-hidden />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" aria-hidden />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                  Sign up
                </Link>
              </>
            )}
          </div>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,85vw)]">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {links.map((link) => {
                  const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                  return (
                    <SheetClose
                      key={link.href}
                      nativeButton={false}
                      render={
                        <Link
                          href={link.href}
                          className={cn(
                            "rounded-lg px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        />
                      }
                    >
                      {link.label}
                    </SheetClose>
                  );
                })}
                <div className="mt-3 flex flex-col gap-2 border-t pt-4">
                  {!loading && user ? (
                    <>
                      <SheetClose
                        nativeButton={false}
                        render={
                          <Link
                            href="/portfolio"
                            className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                          />
                        }
                      >
                        My portfolio
                      </SheetClose>
                      <SheetClose
                        nativeButton={false}
                        render={
                          <Link
                            href="/settings"
                            className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                          />
                        }
                      >
                        Settings
                      </SheetClose>
                      <Button variant="outline" size="sm" onClick={() => signOut()}>
                        Log out
                      </Button>
                    </>
                  ) : (
                    <>
                      <SheetClose
                        nativeButton={false}
                        render={
                          <Link
                            href="/login"
                            className={buttonVariants({ variant: "outline", size: "lg" })}
                          />
                        }
                      >
                        Log in
                      </SheetClose>
                      <SheetClose
                        nativeButton={false}
                        render={<Link href="/signup" className={buttonVariants({ size: "lg" })} />}
                      >
                        Sign up
                      </SheetClose>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
