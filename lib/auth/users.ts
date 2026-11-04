import "server-only";
import { requireSql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const sql = requireSql();
  const rows = await sql<UserRow[]>`select id, email, name, password_hash from users where email = ${email}`;
  return rows[0] ?? null;
}

export async function createUser(input: { email: string; name: string | null; password: string }) {
  const sql = requireSql();
  const passwordHash = await hashPassword(input.password);
  const rows = await sql<{ id: string }[]>`
    insert into users (email, name, password_hash) values (${input.email}, ${input.name}, ${passwordHash})
    on conflict (email) do nothing
    returning id
  `;
  return rows[0]?.id ?? null;
}

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  // Deliberately loose: one @, something either side, a dot in the domain.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}
