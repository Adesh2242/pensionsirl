"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormField } from "@/components/auth/form-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { postAuth, useAuth } from "@/lib/auth-context";
import { HOME_AFTER_SIGN_IN, safeNextPath } from "@/lib/safe-next";

function SignupForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { refresh, accountsEnabled } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const problem = await postAuth("/api/auth/signup", { name, email, password });
    if (problem) {
      setLoading(false);
      setError(problem);
      return;
    }
    await refresh();
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      label="sign up"
      lines={["start", "tracking."]}
      description={
        accountsEnabled
          ? "track funds, save comparisons and get monthly value estimates."
          : "accounts are unavailable right now — please try again shortly."
      }
      footer={
        <>
          already have an account?{" "}
          <Link
            href={next === HOME_AFTER_SIGN_IN ? "/login" : `/login?next=${encodeURIComponent(next)}`}
            className="link-underline text-foreground"
          >
            log in
          </Link>
        </>
      }
    >
      <GoogleSignInButton next={next} divider="or sign up with email" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="name"
          label="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormField
          id="email"
          label="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.ie"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          id="password"
          label="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="at least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="lower font-mono text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="lower pill inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
        >
          {loading ? "creating account…" : "create account"}
          <span aria-hidden>↗</span>
        </button>
        <p className="lower font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          by creating an account you confirm you&apos;re 16 or over and agree to our{" "}
          <Link href="/terms" className="link-underline text-foreground">
            terms
          </Link>
          . we store your name, email and the pensions you add — in the eu, never sold,
          deletable any time from settings. see the{" "}
          <Link href="/privacy" className="link-underline text-foreground">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  // useSearchParams() needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
