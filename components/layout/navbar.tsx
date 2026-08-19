"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PiggyBank } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
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
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/funds", label: "Funds" },
  { href: "/compare", label: "Compare" },
  { href: "/calculator", label: "Calculator" },
  { href: "/ai-suggestions", label: "AI Suggestions" },
  { href: "/how-it-works", label: "How it Works" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <PiggyBank className="h-5 w-5 text-primary" aria-hidden />
          <span>PensionIQ</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors hover:text-foreground ${
                pathname?.startsWith(link.href) ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="gap-2" />}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {(user.name ?? user.email)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.name ?? user.email}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
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
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium">
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {!loading && user ? (
                  <>
                    <Link href="/settings" className="text-sm font-medium">
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="text-left text-sm font-medium text-muted-foreground"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-sm font-medium">
                      Log in
                    </Link>
                    <Link href="/signup" className="text-sm font-medium">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
