import type { Metadata } from "next";
import { Anton, Cormorant_Garamond, DM_Serif_Display, Fraunces, Geist, Geist_Mono, Outfit, Pacifico, Pirata_One, Shrikhand } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import NoControlFocus from "@/components/NoControlFocus";
import CopyNotes from "@/features/devtools/copy/CopyNotes";
import { devUi } from "@/features/devtools/gate";
import QuickRecord from "@/features/recorder/QuickRecord";
import Spotlight from "@/features/search/Spotlight";
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
  title: {
    default: "attunr: your one-stop hub for music drills and theory",
    template: "%s",
  },
  description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  keywords: [
    "guitar theory",
    "guitar practice",
    "fretboard notes",
    "CAGED system",
    "guitar scales",
    "guitar modes",
    "guitar chords",
    "online guitar tuner",
    "ear training",
    "guitar triads",
    "arpeggios",
    "audio looper",
    "music school practice",
  ],
  authors: [{ name: "attunr" }],
  creator: "attunr",
  publisher: "attunr",
  applicationName: "attunr",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "attunr",
    locale: "en_US",
    url: SITE_URL,
    title: "attunr: your one-stop hub for music drills and theory",
    description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  },
  twitter: {
    card: "summary_large_image",
    title: "attunr: your one-stop hub for music drills and theory",
    description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "attunr",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description: "Music drills, guitar theory, practice tools and interactive fretboard visualizer.",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "attunr",
      url: SITE_URL,
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="plain" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} ${styleFonts} antialiased`}
      >
        <NoControlFocus />
        {children}
        <QuickRecord />
        <Spotlight />
        {devUi() && <CopyNotes />}
        <Analytics />
      </body>
    </html>
  );
}
