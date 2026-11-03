/**
 * Builds and downloads CSV files in the browser. Nothing here touches the
 * network: exports are generated on the visitor's own device, so no
 * personal data leaves it.
 */

export type CsvCell = string | number | null | undefined;
export type CsvRow = CsvCell[];

/**
 * Quotes a cell for CSV, and neutralises spreadsheet formula injection
 * (OWASP "CSV injection"): a text cell starting with = + - @ or a tab or
 * carriage return is run as a formula by Excel and Sheets, so it gets a
 * leading apostrophe. Numbers are written as plain numbers.
 */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvRow[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Rounds to cents, for money columns. */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rounds a percentage to 2 decimal places. */
export function pct(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "pensioniq-portfolio-2026-11-03.csv" */
export function csvFileName(name: string, at = new Date()): string {
  return `pensioniq-${name}-${at.toISOString().slice(0, 10)}.csv`;
}

/**
 * Saves `rows` as a CSV file. A UTF-8 byte-order mark is prepended so Excel
 * reads € and accents correctly.
 */
export function downloadCsv(fileName: string, rows: CsvRow[]) {
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
