import type { Metadata } from "next";
import { Anton, Cormorant_Garamond, DM_Serif_Display, Fraunces, Geist, Geist_Mono, Outfit, Pacifico, Pirata_One, Shrikhand } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import NoControlFocus from "@/components/NoControlFocus";
import QuickRecord from "@/features/recorder/QuickRecord";
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

/* the site's display face (headings, the style switcher); SOFT rounds the serifs */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

/* the attunr wordmark */
const outfit = Outfit({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "600",
});

/* the music styles' headline faces (landing page and the style switcher only), loaded on demand */
const funkFont = Shrikhand({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-funk" });
const rockFont = Anton({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-rock" });
const metalFont = Pirata_One({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-metal" });
const bluesFont = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"], variable: "--font-blues" });
const jazzFont = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-jazz" });
const surfFont = Pacifico({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-surf" });
const styleFonts = [funkFont, rockFont, metalFont, bluesFont, jazzFont, surfFont].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "attunr: your one-stop hub for music drills and theory",
  description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  /* no og title or description here: Next fills them from each page's own,
     and the image comes from app/opengraph-image.tsx */
  openGraph: {
    type: "website",
    siteName: "attunr",
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
    <html lang="en" data-theme="funk" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} ${styleFonts} antialiased`}
      >
        <NoControlFocus />
        {children}
        <QuickRecord />
        <Analytics />
      </body>
    </html>
  );
}
