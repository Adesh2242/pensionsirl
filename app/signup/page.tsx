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

function SignupForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    // Projects with email confirmation enabled (Supabase's default) return a
    // user but no session until the confirmation link is clicked.
    if (!data.session) {
      setConfirmEmailSent(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (confirmEmailSent) {
    return (
      <AuthShell
        label="almost there"
        lines={["check your", "email."]}
        description={
          <>
            we sent a confirmation link to{" "}
            <span className="text-foreground">{email}</span>. click it to activate your account,
            then log in.
          </>
        }
      >
        <Link
          href="/login"
          className="lower pill inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary"
        >
          go to log in <span aria-hidden>↗</span>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      label="sign up"
      lines={["start", "tracking."]}
      description={
        isSupabaseConfigured()
          ? "track funds, save comparisons and get monthly value estimates."
          : "demo mode — accounts are stored in your browser only, nothing leaves this device."
      }
      footer={
        <>
          already have an account?{" "}
          <Link
            href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
            className="link-underline text-foreground"
          >
            log in
          </Link>
        </>
      }
    >
      <GoogleSignInButton next={next} />
      <p className="lower my-7 font-mono text-xs text-muted-foreground">or sign up with email</p>

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
