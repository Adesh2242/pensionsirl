import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Your Pension Portfolio",
  description:
    "Track your pension funds in one place, with values kept current from market prices, projections and what charges cost you.",
  path: "/portfolio",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
