export const CONSENT_STORAGE_KEY = "pensioniq_cookie_consent";

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
  return state;
}
