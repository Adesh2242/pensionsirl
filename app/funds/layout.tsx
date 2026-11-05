import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Compare Irish Pension Funds: Returns, Charges & Risk",
  description:
    "Search and filter hundreds of Irish pension funds from 10 providers — Irish Life, Zurich, Aviva, New Ireland and more. See 1, 3, 5 and 10-year returns, annual charges and risk ratings side by side.",
  path: "/funds",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
