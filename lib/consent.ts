export const CONSENT_STORAGE_KEY = "pensioniq_cookie_consent";

/** Fired in this tab whenever the consent choice is saved. */
export const CONSENT_CHANGED_EVENT = "pensioniq:consent-changed";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
}

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean) {
  if (typeof window === "undefined") return;
  const state: ConsentState = { necessary: true, analytics, decidedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));

  // Best-effort server-side audit log (see app/api/consent/route.ts).
  // localStorage above is the source of truth for the user's actual
  // consent — this call is fire-and-forget and must never block or throw.
  fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analytics }),
  }).catch(() => {});

  return state;
}

/** Fired to reopen the cookie preferences from anywhere (footer, settings). */
export const OPEN_COOKIE_SETTINGS_EVENT = "pensioniq:open-cookie-settings";

/**
 * Reopens the cookie preferences, so consent can be withdrawn as easily as
 * it was given (GDPR Art. 7(3)).
 */
export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
