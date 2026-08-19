"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isMockMode: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isMockMode: true,
  signOut: async () => {},
});

function toAuthUser(user: { id: string; email?: string; user_metadata?: { name?: string } } | null): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? "", name: user.user_metadata?.name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(toAuthUser(data.user));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isMockMode: !isSupabaseConfigured(), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
