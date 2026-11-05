import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PensionIQ — Compare Irish Pension Funds & Pension Calculator",
    template: "%s | PensionIQ",
  },
  description:
    "Compare Irish pension funds from 10 providers by returns, charges and risk, estimate your retirement pot with Revenue's tax relief rules, and track your own pension portfolio. Free.",
  applicationName: "PensionIQ",
  alternates: { canonical: "/" },
  category: "finance",
  keywords: [
    "pension Ireland",
    "Irish pension funds",
    "pension calculator Ireland",
    "PRSA",
    "retirement planning Ireland",
    "pension tax relief Ireland",
    "AVC",
    "auto-enrolment Ireland",
    "pension fund returns Ireland",
    "pension charges Ireland",
  ],
  openGraph: {
    title: "PensionIQ — Compare Irish Pension Funds & Pension Calculator",
    description:
      "Compare Irish pension funds by returns, charges and risk, estimate your retirement pot, and track your pension portfolio.",
    url: "/",
    siteName: "PensionIQ",
    locale: "en_IE",
    type: "website",
  },
  appleWebApp: { title: "PensionIQ" },
  twitter: {
    card: "summary_large_image",
    title: "PensionIQ — Compare Irish Pension Funds & Pension Calculator",
    description:
      "Compare Irish pension funds by returns, charges and risk, estimate your retirement pot, and track your pension portfolio.",
  },
};

// Matches the near-black canvas so mobile browser chrome blends into the page.
export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IE"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="lower sr-only font-mono focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          skip to content
        </a>
        <AuthProvider>
          <Navbar />
          <main id="main" className="animate-page-in flex-1">
            {children}
          </main>
          <Footer />
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
