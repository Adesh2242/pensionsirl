import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create a Free Account",
  description:
    "Create a free PensionIQ account to track your Irish pension funds, see projections and get reports by email.",
  path: "/signup",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
