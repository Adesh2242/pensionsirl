/**
 * Sends email through Resend's HTTP API (EU region domain). No SDK: one
 * fetch. Needs EMAIL_API_KEY (a sending-only key); EMAIL_FROM overrides the
 * sender. No server-only import, so the scheduled job can use it too —
 * but it must only ever run on the server.
 */

export interface EmailAttachment {
  filename: string;
  /** Base64. */
  content: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  /** Resend drops a repeat of the same key within 24 hours, so a retry never double-sends. */
  idempotencyKey?: string;
}

export const DEFAULT_FROM = "PensionIQ <reports@pensionwise.ie>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_API_KEY);
}

export async function sendEmail(email: OutgoingEmail): Promise<{ id: string }> {
  const key = process.env.EMAIL_API_KEY;
  if (!key) throw new Error("EMAIL_API_KEY is not set.");
  // EMAIL_API_URL: only for pointing tests at a local stand-in.
  const response = await fetch(process.env.EMAIL_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments,
      headers: email.headers,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) throw new Error(`Email not sent (${response.status}): ${body.message ?? "unknown error"}`);
  return { id: body.id };
}

/** Escapes text for HTML email bodies. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
