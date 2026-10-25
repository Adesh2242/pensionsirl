import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { ThemeScript } from "@/components/theme/theme-script";
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
    default: "PensionIQ — Irish Pension Fund Explorer & Retirement Calculator",
    template: "%s | PensionIQ",
  },
  description:
    "Compare Irish pension funds across 10 providers, project your retirement pot with Irish Revenue tax relief rules, and get AI-powered fund suggestions.",
  keywords: [
    "pension Ireland",
    "Irish pension funds",
    "pension calculator Ireland",
    "PRSA",
    "retirement planning Ireland",
    "pension tax relief Ireland",
  ],
  openGraph: {
    title: "PensionIQ — Irish Pension Fund Explorer & Retirement Calculator",
    description:
      "Compare Irish pension funds, project your retirement pot, and get AI-powered fund suggestions.",
    url: SITE_URL,
    siteName: "PensionIQ",
    locale: "en_IE",
    type: "website",
  },
  appleWebApp: { title: "PensionIQ" },
  twitter: {
    card: "summary_large_image",
    title: "PensionIQ — Irish Pension Fund Explorer & Retirement Calculator",
    description:
      "Compare Irish pension funds, project your retirement pot, and get AI-powered fund suggestions.",
  },
};

// Matches the light/dark --background tokens so mobile browser chrome blends in.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfdff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e131b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IE"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <AuthProvider>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
