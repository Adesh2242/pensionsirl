import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Log In",
  description:
    "Log in to PensionIQ to see your pension portfolio.",
  path: "/login",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
