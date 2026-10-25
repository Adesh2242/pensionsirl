import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RiskBadge } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import { hueForName } from "@/lib/color-hash";
import type { Fund } from "@/lib/types";
import { formatAmc } from "@/lib/utils";

export function FundCard({ fund }: { fund: Fund }) {
  return (
    <Card className="card-interactive group relative flex h-full flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold ${hueForName(fund.providerName)}`}
            aria-hidden
          >
            {fund.providerName[0]}
          </span>
          <p className="truncate text-xs text-muted-foreground">{fund.providerName}</p>
        </div>
        <Link
          href={`/funds/${fund.slug}`}
          className="font-semibold leading-snug tracking-tight after:absolute after:inset-0 hover:text-primary"
        >
          {fund.name}
        </Link>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <AssetClassBadge assetClass={fund.assetClass} />
          <RiskBadge risk={fund.riskRating} />
        </div>
      </CardHeader>

      <CardContent className="mt-auto space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Annual charge</p>
            <p className="tabular mt-0.5 font-semibold">{formatAmc(fund.amc)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">1yr return</p>
            <ReturnValue value={fund.oneYearReturn} className="mt-0.5 text-sm font-semibold" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Risk</span>
            <span className="tabular">{fund.riskRating}/7</span>
          </div>
          <RiskMeter risk={fund.riskRating} size="sm" />
        </div>

        {/* Raised above the card-wide link overlay so both actions stay clickable. */}
        <div className="relative z-10 flex gap-2">
          <Link
            href={`/funds/${fund.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1" })}
          >
            Details
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href={`/compare?funds=${fund.slug}`}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "flex-1" })}
          >
            Compare
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
