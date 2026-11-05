import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Settings",
  description:
    "Your PensionIQ account settings.",
  path: "/settings",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
