import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from "@/i18n";
import { dirOf } from "@/i18n/config";

// Fonts are self-hosted via ./fonts.css (@font-face + /fonts/*.woff2).
// The CSS variables --font-jakarta / --font-cormorant / --font-cairo / --font-amiri
// are declared there and consumed by globals.css (--font-sans / --font-display,
// with the RTL override swapping in Cairo / Amiri).

export const metadata: Metadata = {
  title: {
    default: "Kafeely | Dubai Premium Rental Protection Platform",
    template: "%s | Kafeely",
  },
  description:
    "Rental income protection for Dubai's premium residential property market. Multi-role dashboards for landlords, tenants, brokers, agents, facility management and leasing teams.",
  icons: { icon: "/kafeely-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <Providers>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
