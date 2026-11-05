import { ImageResponse } from "next/og";
import { getFundBySlug } from "@/lib/data/funds.server";
import { returnFor } from "@/lib/fund-returns";
import { formatAmc } from "@/lib/utils";

export const alt = "Pension fund returns, charges and risk on PensionIQ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const pct = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`);

/** A share card per fund: its name, provider and the three figures that matter. */
export default async function FundImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fund = await getFundBySlug(id);
  const stats = fund
    ? [
        { label: "5-yr avg / yr", value: pct(returnFor(fund, "5y")) },
        { label: "annual charge", value: formatAmc(fund.amc) },
        { label: "risk", value: `${fund.riskRating}/7` },
      ]
    : [];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #050505 0%, #14202b 60%, #3c5a73 140%)",
          color: "#f3f1ea",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#b9b6ad" }}>
          <span>pensioniq</span>
          <span>{fund?.providerName.toLowerCase() ?? ""}</span>
        </div>
        <div style={{ display: "flex", fontSize: fund && fund.name.length > 40 ? 58 : 72, lineHeight: 1.05, letterSpacing: -2 }}>
          {(fund?.name ?? "pension fund").toLowerCase()}
        </div>
        <div style={{ display: "flex", gap: 64 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 24, color: "#b9b6ad" }}>{s.label}</span>
              <span style={{ fontSize: 56 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
