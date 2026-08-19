import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RiskBadge } from "@/components/funds/risk-badge";
import type { Fund } from "@/lib/types";

export function FundCard({ fund }: { fund: Fund }) {
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/50">
      <CardHeader className="gap-1">
        <p className="text-xs text-muted-foreground">{fund.providerName}</p>
        <Link href={`/funds/${fund.slug}`} className="font-semibold leading-snug hover:underline">
          {fund.name}
        </Link>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline">{fund.assetClass}</Badge>
          <RiskBadge risk={fund.riskRating} />
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">AMC</p>
            <p className="font-medium">{fund.amc.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">1yr return</p>
            <p className={`font-medium ${fund.oneYearReturn >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fund.oneYearReturn >= 0 ? "+" : ""}
              {fund.oneYearReturn.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/funds/${fund.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1" })}
          >
            Details
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
