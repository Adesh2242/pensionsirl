"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

type Frequency = "off" | "monthly" | "quarterly" | "yearly";

interface Settings {
  email: string;
  emailVerified: boolean;
  frequency: Frequency;
  horizon: number;
  real: boolean;
  nextSendOn: string | null;
  lastSentAt: string | null;
}

const OPTIONS: { value: Frequency; label: string }[] = [
  { value: "off", label: "off" },
  { value: "monthly", label: "monthly" },
  { value: "quarterly", label: "quarterly" },
  { value: "yearly", label: "yearly" },
];

const day = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" }).toLowerCase();

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

/**
 * "Email me this report": monthly, quarterly or yearly, with the PDF
 * attached, or one now. Reports only go to a confirmed address, so this
 * first asks password accounts to confirm theirs.
 */
export function EmailReports({ horizon, real, verifiedParam }: { horizon: number; real: boolean; verifiedParam: string | null }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState<null | "save" | "verify" | "send">(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    verifiedParam === "verified"
      ? { tone: "ok", text: "email confirmed. choose how often you'd like your report." }
      : verifiedParam === "link-expired"
        ? { tone: "error", text: "that confirmation link has expired or was already used. send a new one below." }
        : null,
  );

  // The ?email= note from the confirmation link is shown once, not on every reload.
  useEffect(() => {
    if (!verifiedParam) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("email");
    window.history.replaceState(window.history.state, "", url);
  }, [verifiedParam]);

  useEffect(() => {
    call("/api/reports", "GET")
      .then((d) => {
        setSettings(d.settings);
        setAvailable(Boolean(d.available));
      })
      .catch(() => setAvailable(false));
  }, []);

  async function run(kind: "save" | "verify" | "send", action: () => Promise<void>) {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage({ tone: "error", text: (e instanceof Error ? e.message : "Something went wrong.").toLowerCase() });
    } finally {
      setBusy(null);
    }
  }

  const choose = (frequency: Frequency) =>
    run("save", async () => {
      const d = await call("/api/reports", "PUT", { frequency, horizon, real });
      setSettings(d.settings);
      setMessage({
        tone: "ok",
        text:
          frequency === "off"
            ? "report emails are off."
            : `saved — your first ${frequency} report arrives on ${day(d.settings.nextSendOn)}.`,
      });
    });

  const verify = () =>
    run("verify", async () => {
      const d = await call("/api/account/verify-email", "POST");
      setMessage({ tone: "ok", text: d.alreadyVerified ? "your email is already confirmed." : `check ${d.to} for a confirmation link (it works for 24 hours).` });
    });

  const sendNow = () =>
    run("send", async () => {
      const d = await call("/api/reports/send", "POST", { horizon, real });
      setMessage({ tone: "ok", text: `sent to ${d.to} — it should arrive within a minute.` });
    });

  if (!available || !settings) return null;
  const active = settings.frequency !== "off";
  const savedView = active && (settings.horizon !== horizon || settings.real !== real);

  return (
    <div id="email-reports" className="mt-12 scroll-mt-28 border-t border-border pt-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="lower inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" aria-hidden /> email me this report
          </p>
          <p className="lower mt-2 max-w-md text-sm text-muted-foreground">
            the same pdf report, kept current with market prices, emailed to <span className="text-foreground">{settings.email}</span> on
            the 1st of each month, quarter or year. stop any time — every email has an unsubscribe link.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {settings.emailVerified ? (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="how often to email your report">
                {OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => choose(o.value)}
                    aria-pressed={settings.frequency === o.value}
                    className={`lower rounded-full border px-4 py-1.5 font-mono text-xs transition-colors disabled:opacity-60 ${
                      settings.frequency === o.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={sendNow}
                disabled={busy !== null}
                className="lower link-underline font-mono text-xs text-primary disabled:opacity-50"
              >
                {busy === "send" ? "sending…" : "send me one now ↗"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={verify}
              disabled={busy !== null}
              className="lower inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy === "verify" ? "sending link…" : "confirm my email to start"}
            </button>
          )}
          <span
            role="status"
            className={`lower max-w-xs text-right font-mono text-[0.7rem] ${message?.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {message
              ? message.text
              : !settings.emailVerified
                ? "we'll email you a link first, so reports only go to an inbox you own"
                : active && settings.nextSendOn
                  ? `next report ${day(settings.nextSendOn)}${settings.lastSentAt ? ` · last sent ${day(settings.lastSentAt)}` : ""}`
                  : "no report emails set up"}
          </span>
          {savedView ? (
            <button
              type="button"
              onClick={() => choose(settings.frequency)}
              disabled={busy !== null}
              className="lower font-mono text-[0.7rem] text-muted-foreground underline hover:text-foreground"
            >
              emails show the {settings.horizon}-year view{settings.real ? " in today's money" : ""} — use this one instead
            </button>
          ) : null}
        </div>
      </div>
      <p className="lower mt-6 max-w-2xl font-mono text-[0.7rem] text-muted-foreground">
        the pdf holds your portfolio figures and travels as an ordinary email attachment. it&apos;s made on our server in the eu
        and sent through resend, our email provider (eu region). we don&apos;t store the pdf.
      </p>
    </div>
  );
}
