"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormField } from "@/components/auth/form-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { postAuth, useAuth } from "@/lib/auth-context";
import { HOME_AFTER_SIGN_IN, safeNextPath } from "@/lib/safe-next";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { refresh, accountsEnabled } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "oauth" ? "google sign-in didn't complete. please try again." : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const problem = await postAuth("/api/auth/login", { email, password });
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
      label="log in"
      lines={["welcome", "back."]}
      description={
        accountsEnabled
          ? "log in to your pensioniq account."
          : "accounts are unavailable right now — please try again shortly."
      }
      footer={
        <>
          no account yet?{" "}
          <Link
            href={next === HOME_AFTER_SIGN_IN ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}
            className="link-underline text-foreground"
          >
            create one
          </Link>
        </>
      }
    >
      <GoogleSignInButton next={next} divider="or continue with email" />

      <form onSubmit={handleSubmit} className="space-y-5">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="lower font-mono text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="lower pill inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
        >
          {loading ? "logging in…" : "log in"}
          <span aria-hidden>↗</span>
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams() needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
