import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · NexLevel Gaming Store",
    default: "NexLevel Gaming Store — Gift Cards, Game Keys & Top-Up Services",
  },
  description:
    "Digital gaming store: gift cards, Steam & Epic game keys, and RedotPay / Binance / Rizon charging services. Pay with D17/e-Dinar, Flouci, Cash or WafaCash. Prices in TND & USD.",
  keywords: ["gift cards", "steam keys", "epic games", "game keys", "redotpay", "binance", "rizon", "tunisia"],
  openGraph: {
    type: "website",
    siteName: "NexLevel Gaming Store",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "#10121c",
              border: "1px solid #232739",
              color: "#f3f4f8",
            },
          }}
        />
      </body>
    </html>
  );
}
