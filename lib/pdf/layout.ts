/**
 * Shared page layout for PensionIQ's PDF reports, drawn with jsPDF in the
 * visitor's browser: nothing is uploaded, so personal figures never leave
 * their device. A4 portrait, millimetres. Everything is vector — text stays
 * selectable and charts stay sharp at any zoom or print size.
 *
 * jsPDF's built-in Helvetica covers Windows-1252 only, so text goes through
 * `clean()` first: it keeps € and en/em dashes and swaps the few characters
 * the site uses that would otherwise print as garbage (true minus, curly
 * quotes, arrows).
 */
import { jsPDF } from "jspdf";
import autoTable, { type RowInput, type UserOptions } from "jspdf-autotable";
import { disclaimerLines, type DisclaimerKind } from "@/lib/disclaimers";

export const PAGE = { width: 210, height: 297, margin: 16 } as const;
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FOOTER_SPACE = 18;
const BOTTOM = PAGE.height - FOOTER_SPACE;

type RGB = [number, number, number];

/** The site's palette, adjusted for white paper. */
export const COLOR = {
  ink: [17, 22, 20],
  muted: [95, 107, 103],
  faint: [150, 160, 157],
  hairline: [217, 222, 220],
  panel: [245, 247, 246],
  teal: [64, 155, 150],
  tealSoft: [207, 230, 228],
  tealDark: [38, 110, 106],
  slate: [100, 120, 145],
  orange: [226, 91, 36],
  sun: [242, 202, 70],
  green: [47, 143, 128],
  lilac: [155, 138, 209],
  rose: [199, 125, 155],
} satisfies Record<string, RGB>;

export const ASSET_COLORS: Record<string, RGB> = {
  Equity: COLOR.teal,
  Bond: COLOR.slate,
  Cash: COLOR.green,
  Property: COLOR.sun,
  "Multi-Asset": COLOR.orange,
  Lifecycle: COLOR.lilac,
  Alternative: COLOR.rose,
};

/** Makes text safe for the built-in Windows-1252 fonts. */
export function clean(text: string): string {
  return text
    .replace(/−/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[←-⇿↗▸]/g, "")
    .replace(/ /g, " ");
}

const euroFormat = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function euro(value: number): string {
  return clean(euroFormat.format(Math.round(value)));
}

/** €1.2m / €45k / €900 — for chart axes. */
export function compactEuro(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `€${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 1_000) return `€${Math.round(value / 1_000)}k`;
  return `€${Math.round(value)}`;
}

export function percent(value: number, digits = 1, signed = false): string {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function longDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** A report in progress: the document plus a cursor that flows down the page. */
export class Report {
  readonly doc: jsPDF;
  y: number = PAGE.margin;

  constructor(
    private readonly meta: { title: string; subtitle: string; generated: Date },
  ) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    this.doc.setProperties({
      title: `PensionIQ ${meta.title}`,
      subject: meta.subtitle,
      author: "PensionIQ",
      creator: "PensionIQ",
      keywords: "pension, projection, ireland",
    });
    this.cover();
  }

  fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }
  stroke(c: RGB) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }
  color(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }
  font(size: number, style: "normal" | "bold" = "normal", c: RGB = COLOR.ink) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    this.color(c);
  }

  /** The masthead on page one: wordmark, report title, dates. */
  private cover() {
    const { doc } = this;
    this.fill(COLOR.ink);
    doc.rect(0, 0, PAGE.width, 46, "F");
    // Wordmark: "pension" over a teal "iq", as on the site.
    this.font(15, "bold", [245, 245, 242]);
    doc.text("pension", PAGE.margin, 17);
    this.font(15, "bold", COLOR.teal);
    doc.text("iq", PAGE.margin, 23);
    this.font(22, "bold", [245, 245, 242]);
    doc.text(clean(this.meta.title), PAGE.margin, 36);
    this.font(8.5, "normal", [190, 198, 195]);
    doc.text(clean(this.meta.subtitle), PAGE.width - PAGE.margin, 17, { align: "right" });
    doc.text(`Generated ${longDate(this.meta.generated)}`, PAGE.width - PAGE.margin, 22, {
      align: "right",
    });
    this.y = 58;
  }

  /** Starts a new page if `height` mm won't fit below the cursor. */
  ensure(height: number) {
    if (this.y + height > BOTTOM) this.newPage();
  }

  newPage() {
    this.doc.addPage();
    this.y = PAGE.margin + 4;
  }

  /** A numbered section heading with a hairline under it. */
  section(title: string, note?: string) {
    // A heading never sits alone at the foot of a page.
    this.ensure(48);
    this.y += 4;
    this.font(13, "bold");
    this.doc.text(clean(title), PAGE.margin, this.y);
    if (note) {
      this.font(8, "normal", COLOR.muted);
      this.doc.text(clean(note), PAGE.width - PAGE.margin, this.y, { align: "right" });
    }
    this.y += 2.5;
    this.stroke(COLOR.hairline);
    this.doc.setLineWidth(0.3);
    this.doc.line(PAGE.margin, this.y, PAGE.width - PAGE.margin, this.y);
    this.y += 6;
  }

  /** Body text, wrapped to `width`. */
  paragraph(text: string, { size = 9, c = COLOR.muted, width = CONTENT_WIDTH, gap = 3 } = {}) {
    this.font(size, "normal", c);
    const lines = this.doc.splitTextToSize(clean(text), width) as string[];
    const lineHeight = size * 0.42;
    this.ensure(lines.length * lineHeight + gap);
    this.doc.text(lines, PAGE.margin, this.y);
    this.y += lines.length * lineHeight + gap;
  }

  /** A row of headline figures, each with a label, value and detail line. */
  stats(items: { label: string; value: string; detail?: string; tone?: RGB }[]) {
    const gap = 4;
    const width = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length;
    const height = 26;
    this.ensure(height + 6);
    items.forEach((item, i) => {
      const x = PAGE.margin + i * (width + gap);
      this.fill(COLOR.panel);
      this.doc.rect(x, this.y, width, height, "F");
      this.fill(item.tone ?? COLOR.teal);
      this.doc.rect(x, this.y, 1, height, "F");
      this.font(7.5, "normal", COLOR.muted);
      this.doc.text(clean(item.label).toUpperCase(), x + 4.5, this.y + 6.5, { maxWidth: width - 7 });
      this.font(item.value.length > 11 ? 13 : 16, "bold", item.tone ?? COLOR.ink);
      this.doc.text(clean(item.value), x + 4.5, this.y + 15.5);
      if (item.detail) {
        this.font(7, "normal", COLOR.muted);
        const lines = this.doc.splitTextToSize(clean(item.detail), width - 8) as string[];
        this.doc.text(lines.slice(0, 2), x + 4.5, this.y + 20.5);
      }
    });
    this.y += height + 7;
  }

  /** A table in the report's style, flowing across pages with repeated headers. */
  table(head: string[], body: RowInput[], options: Partial<UserOptions> = {}) {
    // Room for the header and a couple of rows, or start on a fresh page.
    this.ensure(24);
    const columnStyles = (options.columnStyles ?? {}) as Record<number, { halign?: "left" | "right" | "center" }>;
    autoTable(this.doc, {
      startY: this.y,
      head: [head.map(clean)],
      body: body.map((row) =>
        Array.isArray(row) ? row.map((cell) => (typeof cell === "string" ? clean(cell) : cell)) : row,
      ),
      margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.margin + 4, bottom: FOOTER_SPACE + 2 },
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: COLOR.ink,
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        lineColor: COLOR.hairline,
        overflow: "linebreak",
      },
      headStyles: { fontStyle: "bold", fontSize: 7, textColor: COLOR.muted, fillColor: COLOR.panel },
      bodyStyles: { lineWidth: { bottom: 0.2 } },
      rowPageBreak: "avoid",
      // Headings line up with their column (right-aligned over numbers).
      didParseCell: (data) => {
        if (data.section === "head") {
          data.cell.styles.halign = columnStyles[data.column.index]?.halign ?? "left";
        }
      },
      ...options,
    });
    // autoTable records where it finished.
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  /** The "Important information" panel, in the same words as the page. */
  disclaimer(kind: DisclaimerKind, extra: string[] = []) {
    const lines = [...disclaimerLines(kind), ...extra];
    this.font(8, "normal", COLOR.ink);
    const wrapped = lines.map((l) => this.doc.splitTextToSize(clean(l), CONTENT_WIDTH - 10) as string[]);
    const height = 12 + wrapped.reduce((sum, w) => sum + w.length * 3.5 + 1.6, 0);
    this.ensure(height + 4);
    this.fill([253, 248, 230]);
    this.doc.rect(PAGE.margin, this.y, CONTENT_WIDTH, height, "F");
    this.fill(COLOR.sun);
    this.doc.rect(PAGE.margin, this.y, 1.2, height, "F");
    this.font(9, "bold");
    this.doc.text("Important information", PAGE.margin + 5, this.y + 7);
    let y = this.y + 12.5;
    this.font(8, "normal", COLOR.ink);
    for (const w of wrapped) {
      this.doc.text(w, PAGE.margin + 5, y);
      y += w.length * 3.5 + 1.6;
    }
    this.y += height + 6;
  }

  /** Page numbers and the standing footer, on every page. Runs once. */
  private finished = false;
  private finish() {
    if (this.finished) return;
    this.finished = true;
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.stroke(COLOR.hairline);
      this.doc.setLineWidth(0.3);
      this.doc.line(PAGE.margin, PAGE.height - 13, PAGE.width - PAGE.margin, PAGE.height - 13);
      this.font(7, "normal", COLOR.faint);
      this.doc.text(
        "PensionIQ - information only, not regulated financial advice. Past performance is not a reliable guide to future performance.",
        PAGE.margin,
        PAGE.height - 8.5,
      );
      this.doc.text(`Page ${i} of ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 8.5, {
        align: "right",
      });
    }
  }

  save(fileName: string) {
    this.finish();
    this.doc.save(fileName);
  }

  /** The finished file's bytes, without saving (for tests). */
  output(): ArrayBuffer {
    this.finish();
    return this.doc.output("arraybuffer");
  }
}
