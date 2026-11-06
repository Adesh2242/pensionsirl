import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Irish Pension Calculator: Retirement Income, Drawdown & Tax Relief",
  description:
    "Plan your pension in Ireland from saving to spending: your pot at retirement, the 25% tax-free lump sum, how long your income lasts, retiring before the State Pension at 66, inflation and Revenue's tax relief limits.",
  path: "/calculator",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
