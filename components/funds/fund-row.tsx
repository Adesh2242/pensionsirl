import Link from "next/link";
import { RiskBadge } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import type { Fund } from "@/lib/types";
import { formatAmc } from "@/lib/utils";

/**
 * One fund as an editorial row rather than a card: index, name, class and risk
 * on the left, the two figures that decide anything on the right, separated by
 * hairlines. Cards made 112 funds look like 112 identical boxes.
 */
export function FundRow({ fund, index }: { fund: Fund; index: number }) {
  return (
    <Link
      href={`/funds/${fund.slug}`}
      className="row-link group grid grid-cols-1 items-start gap-4 border-t border-border py-7 md:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)] md:items-center md:gap-8"
    >
      <span className="lower tabular font-mono text-xs text-primary">
        {String(index + 1).padStart(3, "0")}
      </span>

      <div className="min-w-0">
        <h3 className="lower font-heading text-xl tracking-tight transition-colors group-hover:text-primary md:text-2xl">
          {fund.name}
        </h3>
        <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">{fund.providerName}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <AssetClassBadge assetClass={fund.assetClass} />
          <RiskBadge risk={fund.riskRating} />
        </div>
        <RiskMeter risk={fund.riskRating} size="sm" className="max-w-40" />
      </div>

      <div className="flex items-baseline justify-between gap-6 md:justify-end md:gap-10">
        <div className="md:text-right">
          <p className="lower font-mono text-[0.65rem] text-muted-foreground">amc</p>
          <p className="tabular mt-1 font-heading text-lg">{formatAmc(fund.amc)}</p>
        </div>
        <div className="md:text-right">
          <p className="lower font-mono text-[0.65rem] text-muted-foreground">1yr</p>
          <ReturnValue value={fund.oneYearReturn} className="mt-1 font-heading text-lg" />
        </div>
        <span
          className="hidden text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary md:inline"
          aria-hidden
        >
          ↗
        </span>
      </div>
    </Link>
  );
}
