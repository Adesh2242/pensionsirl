"use client";

/**
 * Client-side, localStorage-backed stand-in for the Supabase auth API.
 * Used automatically whenever NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are not
 * configured, so login/signup/save-fund flows work end-to-end without a real
 * backend. Swap in real env vars (see README) and lib/supabase/client.ts
 * returns a real Supabase client instead — no other code changes needed.
 */

const SESSION_KEY = "pensioniq_mock_session";
const USERS_KEY = "pensioniq_mock_users";

export interface MockUser {
  id: string;
  email: string;
  user_metadata: { name?: string };
}

interface MockSession {
  user: MockUser;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

type AuthListener = (event: string, session: MockSession | null) => void;

function readUsers(): Record<string, StoredUser> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, StoredUser>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session: MockSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

const listeners = new Set<AuthListener>();

function notify(event: string, session: MockSession | null) {
  listeners.forEach((listener) => listener(event, session));
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getMockClient() {
  return {
    isMock: true as const,
    auth: {
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { name?: string } };
      }) {
        const users = readUsers();
        if (users[email]) {
          return {
            data: { user: null, session: null },
            error: { message: "An account with this email already exists." },
          };
        }
        const id = newId();
        const name = options?.data?.name;
        users[email] = { id, email, password, name };
        writeUsers(users);
        const session: MockSession = { user: { id, email, user_metadata: { name } } };
        writeSession(session);
        notify("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const users = readUsers();
        const record = users[email];
        if (!record || record.password !== password) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid email or password." },
          };
        }
        const session: MockSession = {
          user: { id: record.id, email: record.email, user_metadata: { name: record.name } },
        };
        writeSession(session);
        notify("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() {
        writeSession(null);
        notify("SIGNED_OUT", null);
        return { error: null };
      },
      async getUser() {
        const session = readSession();
        return { data: { user: session?.user ?? null }, error: null };
      },
      async getSession() {
        const session = readSession();
        return { data: { session }, error: null };
      },
      onAuthStateChange(callback: AuthListener) {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(callback),
            },
          },
        };
      },
      /** Mock-only: permanently deletes the current user's account and signs them out. */
      async deleteAccount() {
        const session = readSession();
        if (session) {
          const users = readUsers();
          delete users[session.user.email];
          writeUsers(users);
        }
        writeSession(null);
        notify("SIGNED_OUT", null);
        return { error: null };
      },
    },
  };
}

export type MockClient = ReturnType<typeof getMockClient>;
