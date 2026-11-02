"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormField } from "@/components/auth/form-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { describeAuthError } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-next";

function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      label="log in"
      lines={["welcome", "back."]}
      description={
        isSupabaseConfigured()
          ? "log in to your pensioniq account."
          : "demo mode — accounts are stored in your browser only."
      }
      footer={
        <>
          no account yet?{" "}
          <Link
            href={next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}
            className="link-underline text-foreground"
          >
            create one
          </Link>
        </>
      }
    >
      <GoogleSignInButton next={next} />
      <p className="lower my-7 font-mono text-xs text-muted-foreground">or continue with email</p>

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
