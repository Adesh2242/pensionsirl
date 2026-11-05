/**
 * The emails PensionIQ sends: plain, light HTML that survives every mail
 * client, each with a plain-text twin.
 */
import { escapeHtml } from "@/lib/email/send";
import { NOT_ADVICE, WARNING_ESTIMATES, WARNING_VALUE } from "@/lib/disclaimers";
import { describeFrequency, type Frequency } from "@/lib/reports/schedule";
import type { PortfolioSummary } from "@/lib/portfolio/projection";

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const euro = (v: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const longDate = (d: Date) =>
  d.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Dublin" });

function layout(body: string, footer: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e0d6;border-radius:12px;">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.04em;color:#6b6a65;">pensioniq</td></tr>
<tr><td style="padding:0 32px 28px;font-size:15px;line-height:1.6;">${body}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td style="padding:20px 32px;font-size:11px;line-height:1.6;color:#8a8984;">${footer}</td></tr></table>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function verifyEmail(input: { name: string | null; url: string }): Rendered {
  const hello = input.name ? `Hi ${input.name},` : "Hi,";
  const text = `${hello}

Confirm this email address to get your PensionIQ portfolio reports by email:
${input.url}

The link works for 24 hours. If you didn't ask for this, ignore this email: nothing will be sent.`;
  const html = layout(
    `<p style="margin:0 0 16px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 24px;">Confirm this email address to get your portfolio reports by email.</p>
<p style="margin:0 0 24px;">${button(input.url, "Confirm my email")}</p>
<p style="margin:0;font-size:13px;color:#6b6a65;">The link works for 24 hours. If you didn't ask for this, ignore this email: nothing will be sent.</p>`,
    "You're getting this because someone entered this address on PensionIQ.",
  );
  return { subject: "Confirm your email for PensionIQ reports", html, text };
}

export function reportEmail(input: {
  name: string | null;
  summary: PortfolioSummary;
  holdings: number;
  now: Date;
  siteUrl: string;
  frequency?: Frequency;
  unsubscribeUrl?: string;
}): Rendered {
  const { summary, now, siteUrl, frequency, unsubscribeUrl } = input;
  const hello = input.name ? `Hi ${input.name},` : "Hi,";
  const monthly = summary.monthlyPersonal + summary.monthlyEmployer;
  const portfolioUrl = `${siteUrl}/portfolio`;
  const headline = `Your pension portfolio is worth about ${euro(summary.valueNow)}`;
  const facts = [
    `${input.holdings} ${input.holdings === 1 ? "holding" : "holdings"}`,
    `${euro(monthly)} going in a month`,
    `about ${euro(summary.yearlyChargesNow)} a year in charges`,
  ];
  const why = frequency
    ? `You're getting this ${describeFrequency(frequency)} because you asked for portfolio reports on PensionIQ.`
    : "You asked PensionIQ to send you this report.";
  const warnings = [WARNING_ESTIMATES, WARNING_VALUE, NOT_ADVICE];

  const text = `${hello}

${headline} (estimated ${longDate(now)}).
${facts.join(" · ")}

Your full report is attached as a PDF: holdings, the projection, what charges cost and how the figures are worked out.

See it live: ${portfolioUrl}

${warnings.join("\n")}

${why}${unsubscribeUrl ? `\nStop these emails: ${unsubscribeUrl}` : ""}`;

  const html = layout(
    `<p style="margin:0 0 16px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#6b6a65;">estimated value, ${escapeHtml(longDate(now).toLowerCase())}</p>
<p style="margin:0 0 8px;font-size:32px;line-height:1.2;font-weight:600;">${escapeHtml(euro(summary.valueNow))}</p>
<p style="margin:0 0 24px;font-size:13px;color:#6b6a65;">${escapeHtml(facts.join(" · "))}</p>
<p style="margin:0 0 24px;">Your full report is attached as a PDF: holdings, the projection, what charges cost and how the figures are worked out.</p>
<p style="margin:0 0 24px;">${button(portfolioUrl, "See it live")}</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#6b6a65;">${warnings.map(escapeHtml).join("<br>")}</p>`,
    `${escapeHtml(why)}${
      unsubscribeUrl
        ? ` <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8a8984;">Stop these emails</a> or change how often on your <a href="${escapeHtml(portfolioUrl)}" style="color:#8a8984;">portfolio page</a>.`
        : ""
    }`,
  );
  return { subject: `${headline} — your PensionIQ report`, html, text };
}
