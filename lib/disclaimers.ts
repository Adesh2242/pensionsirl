/**
 * The warnings PensionIQ shows wherever it shows projections or past
 * returns. Worded after the Central Bank of Ireland's Consumer Protection
 * Code warning statements, so they read the way Irish pension documents do.
 * Shared by the on-page <Disclaimer> and the CSV exports, so a downloaded
 * file carries the same warnings as the page it came from.
 */

export const NOT_ADVICE =
  "PensionIQ is an information and research tool. It is not regulated financial advice and is not authorised by the Central Bank of Ireland. Speak to a qualified financial adviser before making pension decisions.";

export const WARNING_ESTIMATES = "Warning: These figures are estimates only. They are not a reliable guide to the future performance of your investment.";

export const WARNING_PAST_PERFORMANCE = "Warning: Past performance is not a reliable guide to future performance.";

export const WARNING_VALUE = "Warning: The value of your investment may go down as well as up.";

export const WARNING_TAX =
  "Tax relief figures follow Revenue's published age-related limits and earnings cap and can change. Your own position depends on your circumstances; check with Revenue or an adviser.";

export const DATA_SOURCE =
  "Fund returns come from publicly published provider data and may be delayed, incomplete or wrong. Check figures against your provider's documents and your statements.";

export type DisclaimerKind = "projection" | "returns" | "calculator" | "ai";

/** The lines for each kind of page, most important first. */
export function disclaimerLines(kind: DisclaimerKind): string[] {
  switch (kind) {
    case "projection":
      return [WARNING_ESTIMATES, WARNING_PAST_PERFORMANCE, WARNING_VALUE, NOT_ADVICE, DATA_SOURCE];
    case "calculator":
      return [WARNING_ESTIMATES, WARNING_VALUE, WARNING_TAX, NOT_ADVICE];
    case "returns":
      return [WARNING_PAST_PERFORMANCE, WARNING_VALUE, DATA_SOURCE, NOT_ADVICE];
    case "ai":
      return [
        "AI answers can be wrong or out of date. Check every figure on the fund's page and with the provider.",
        WARNING_PAST_PERFORMANCE,
        NOT_ADVICE,
      ];
  }
}
