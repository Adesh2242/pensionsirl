import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Irish Pension Calculator with Tax Relief",
  description:
    "Estimate your pension pot at retirement in Ireland. Uses Revenue's age-related tax relief limits and the €115,000 earnings cap, with employer contributions and what your fund's charges cost.",
  path: "/calculator",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
