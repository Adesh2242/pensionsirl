/**
 * When emailed portfolio reports go out. Reports land on the 1st: of every
 * month, of each quarter (Jan, Apr, Jul, Oct), or of January. Dates are
 * ISO (YYYY-MM-DD) calendar days in Irish time, which the daily job uses.
 */
export const FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const REPORT_HORIZONS = [10, 20, 30] as const;

export function isFrequency(value: unknown): value is Frequency {
  return typeof value === "string" && (FREQUENCIES as readonly string[]).includes(value);
}

const MONTHS_BETWEEN: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/** The first scheduled day strictly after `today`. */
export function nextSendOn(frequency: Frequency, today: string): string {
  const [y, m] = today.split("-").map(Number);
  const step = MONTHS_BETWEEN[frequency];
  // Months are 0-based from here; the next month boundary that's a multiple of the step.
  const month = m - 1;
  const next = Math.floor(month / step) * step + step;
  const year = y + Math.floor(next / 12);
  return `${year}-${String((next % 12) + 1).padStart(2, "0")}-01`;
}

/** Today's date in Ireland, as YYYY-MM-DD. */
export function irishToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function describeFrequency(frequency: Frequency): string {
  return frequency === "monthly" ? "every month" : frequency === "quarterly" ? "every quarter" : "every year";
}
