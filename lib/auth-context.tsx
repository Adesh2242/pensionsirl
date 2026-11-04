"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** False when the server has no database, so accounts can't be used. */
  accountsEnabled: boolean;
  googleEnabled: boolean;
  /** Re-reads the session — call after logging in or signing up. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  accountsEnabled: true,
  googleEnabled: false,
  refresh: async () => {},
  signOut: async () => {},
});

interface MeResponse {
  user: { id: string; email: string; name: string | null } | null;
  accounts: boolean;
  google: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsEnabled, setAccountsEnabled] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const data = (await res.json()) as MeResponse;
      setUser(data.user ? { id: data.user.id, email: data.user.email, name: data.user.name ?? undefined } : null);
      setAccountsEnabled(data.accounts);
      setGoogleEnabled(data.google);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reads the session once on load; login/signup call refresh() after.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, accountsEnabled, googleEnabled, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** POSTs JSON to an auth endpoint; returns the error message, or null on success. */
export async function postAuth(path: string, body: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status >= 500 && !data.error) {
      return "we can't reach the sign-in service right now. nothing's wrong with your details — please try again in a few minutes.";
    }
    return (data.error ?? "something went wrong.").toLowerCase();
  } catch {
    return "we can't reach the sign-in service right now. nothing's wrong with your details — please try again in a few minutes.";
  }
}
