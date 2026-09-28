import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://ihor.world"),
  title: "IHOR VASIAKIN — motion & graphic designer",
  description:
    "Графічний та моушн-дизайнер. Візуальні айдентики, моушн та цифровий контент.",
  openGraph: {
    title: "IHOR VASIAKIN — motion & graphic designer",
    description:
      "Графічний та моушн-дизайнер. Візуальні айдентики, моушн та цифровий контент.",
    url: "/",
    siteName: "IHOR VASIAKIN",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IHOR VASIAKIN — motion & graphic designer",
    description:
      "Графічний та моушн-дизайнер. Візуальні айдентики, моушн та цифровий контент.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <div className="frame-vignette" aria-hidden="true" />
        <div className="frame-safe-top" aria-hidden="true" />
        <div className="frame-safe-bottom" aria-hidden="true" />
      </body>
    </html>
  );
}