import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Compare Pension Funds Side by Side",
  description:
    "Put Irish pension funds next to each other: returns over 1, 3, 5 and 10 years, annual management charges, risk ratings and asset mix.",
  path: "/compare",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
