/**
 * Vector charts for the PDF reports, drawn straight onto the page from the
 * same numbers the site charts use — no screenshots, so they print sharp.
 */
import { COLOR, CONTENT_WIDTH, PAGE, Report, clean, compactEuro } from "@/lib/pdf/layout";

type RGB = [number, number, number];

/** A round step giving about `target` gridlines up to `max`. */
function niceStep(max: number, target = 4): number {
  if (max <= 0) return 1;
  const raw = max / target;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

export interface ChartArea {
  /** Lower edge (omit for the axis). */
  from?: number[];
  to: number[];
  color: RGB;
}

export interface ChartLine {
  values: number[];
  color: RGB;
  width?: number;
  dashed?: boolean;
}

export interface LegendItem {
  label: string;
  color: RGB;
  kind: "line" | "dashed" | "area";
}

/**
 * A line/area chart over evenly spaced x labels (years or ages): shaded
 * areas first, then lines, with a € axis, gridlines, every few x labels,
 * an end-value label on the first line, and a legend underneath.
 */
export function lineChart(
  report: Report,
  {
    labels,
    areas = [],
    lines = [],
    legend = [],
    height = 72,
    endLabel,
  }: {
    labels: (string | number)[];
    areas?: ChartArea[];
    lines?: ChartLine[];
    legend?: LegendItem[];
    height?: number;
    /** Label printed at the right end of lines[0]. */
    endLabel?: string;
  },
) {
  const { doc } = report;
  report.ensure(height + 16);
  const axisWidth = 15;
  const x0 = PAGE.margin + axisWidth;
  const plotWidth = CONTENT_WIDTH - axisWidth - 20;
  const top = report.y + 2;
  const plotHeight = height - 10;
  const bottom = top + plotHeight;

  const all = [...areas.flatMap((a) => [...a.to, ...(a.from ?? [])]), ...lines.flatMap((l) => l.values)];
  const max = Math.max(1, ...all.filter(Number.isFinite));
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const n = labels.length;
  const xAt = (i: number) => x0 + (n <= 1 ? 0 : (i / (n - 1)) * plotWidth);
  const yAt = (v: number) => bottom - (Math.max(v, 0) / yMax) * plotHeight;

  // Gridlines and € axis.
  doc.setLineWidth(0.2);
  report.stroke(COLOR.hairline);
  report.font(7, "normal", COLOR.muted);
  for (let v = 0; v <= yMax + 1e-6; v += step) {
    const y = yAt(v);
    doc.line(x0, y, x0 + plotWidth, y);
    doc.text(compactEuro(v), x0 - 2.5, y + 1, { align: "right" });
  }

  // Areas, as filled polygons along the top edge and back along the bottom.
  for (const area of areas) {
    const upper = area.to.map((v, i) => [xAt(i), yAt(v)] as const);
    const lower = (area.from ?? area.to.map(() => 0)).map((v, i) => [xAt(i), yAt(v)] as const).reverse();
    const points = [...upper, ...lower];
    const deltas = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]);
    report.fill(area.color);
    doc.lines(deltas, points[0][0], points[0][1], [1, 1], "F", true);
  }

  // Lines.
  for (const line of lines) {
    report.stroke(line.color);
    doc.setLineWidth(line.width ?? 0.6);
    if (line.dashed) doc.setLineDashPattern([1.2, 1.2], 0);
    const pts = line.values.map((v, i) => [xAt(i), yAt(v)] as const);
    const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "S", false);
    doc.setLineDashPattern([], 0);
  }

  if (endLabel && lines[0]) {
    const last = lines[0].values[lines[0].values.length - 1];
    report.fill(lines[0].color);
    doc.circle(xAt(n - 1), yAt(last), 0.9, "F");
    report.font(7.5, "bold", lines[0].color);
    doc.text(clean(endLabel), xAt(n - 1) + 2, yAt(last) + 1);
  }

  // X labels: about six, always including both ends.
  report.font(7, "normal", COLOR.muted);
  const every = Math.max(1, Math.ceil((n - 1) / 6));
  labels.forEach((label, i) => {
    if (i % every !== 0 && i !== n - 1) return;
    if (i !== n - 1 && n - 1 - i < every / 2) return; // don't crowd the last label
    doc.text(String(label), xAt(i), bottom + 4.5, { align: "center" });
  });
  report.stroke(COLOR.faint);
  doc.setLineWidth(0.3);
  doc.line(x0, bottom, x0 + plotWidth, bottom);

  // Legend.
  let lx = x0;
  const ly = bottom + 10;
  report.font(7.5, "normal", COLOR.ink);
  for (const item of legend) {
    if (item.kind === "area") {
      report.fill(item.color);
      doc.rect(lx, ly - 2.4, 5, 3, "F");
    } else {
      report.stroke(item.color);
      doc.setLineWidth(0.8);
      if (item.kind === "dashed") doc.setLineDashPattern([1.2, 1.2], 0);
      doc.line(lx, ly - 0.9, lx + 5, ly - 0.9);
      doc.setLineDashPattern([], 0);
    }
    doc.text(clean(item.label), lx + 6.5, ly);
    lx += 6.5 + doc.getTextWidth(clean(item.label)) + 7;
  }
  report.y = ly + 7;
}

/** Labelled horizontal bars — e.g. what each kind of charge costs. */
export function barList(
  report: Report,
  items: { label: string; value: number; display: string; color: RGB }[],
) {
  const { doc } = report;
  const rowHeight = 8;
  report.ensure(items.length * rowHeight + 6);
  const labelWidth = 52;
  const barMax = CONTENT_WIDTH - labelWidth - 28;
  const max = Math.max(1, ...items.map((i) => i.value));
  for (const item of items) {
    const y = report.y;
    report.font(8.5, "normal", COLOR.ink);
    doc.text(clean(item.label), PAGE.margin, y + 4);
    report.fill(COLOR.panel);
    doc.rect(PAGE.margin + labelWidth, y, barMax, 5.5, "F");
    report.fill(item.color);
    doc.rect(PAGE.margin + labelWidth, y, Math.max((item.value / max) * barMax, 0.4), 5.5, "F");
    report.font(8.5, "bold", COLOR.ink);
    doc.text(clean(item.display), PAGE.width - PAGE.margin, y + 4, { align: "right" });
    report.y += rowHeight;
  }
  report.y += 3;
}

/** One stacked bar split into shares (asset mix), with a legend. */
export function shareBar(report: Report, slices: { label: string; share: number; color: RGB }[]) {
  const { doc } = report;
  report.ensure(20);
  let x = PAGE.margin;
  for (const s of slices) {
    const w = s.share * CONTENT_WIDTH;
    report.fill(s.color);
    doc.rect(x, report.y, w, 4, "F");
    x += w;
  }
  report.y += 9;
  let lx = PAGE.margin;
  report.font(8, "normal", COLOR.ink);
  for (const s of slices) {
    const label = `${clean(s.label)} ${(s.share * 100).toFixed(0)}%`;
    const width = 6 + doc.getTextWidth(label) + 7;
    if (lx + width > PAGE.width - PAGE.margin) {
      lx = PAGE.margin;
      report.y += 5;
    }
    report.fill(s.color);
    doc.rect(lx, report.y - 2.4, 3, 3, "F");
    doc.text(label, lx + 4.5, report.y);
    lx += width;
  }
  report.y += 8;
}
