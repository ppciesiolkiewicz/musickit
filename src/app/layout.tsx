import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NoControlFocus from "@/components/NoControlFocus";
import { THEME_BOOT } from "@/components/ThemeSwitcher";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* display face for the Music Kit wordmark; SOFT rounds the serifs */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Music Kit",
  description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  /* no og title or description here: Next fills them from each page's own,
     and the image comes from app/opengraph-image.tsx */
  openGraph: {
    type: "website",
    siteName: "Music Kit",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <NoControlFocus />
        {children}
      </body>
    </html>
  );
}
