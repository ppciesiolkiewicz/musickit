import type { Metadata, Viewport } from "next";
import { Anton, Cormorant_Garamond, DM_Serif_Display, Fraunces, Geist, Geist_Mono, Outfit, Pacifico, Pirata_One, Shrikhand } from "next/font/google";
import "./globals.css";
import { AnalyticsAsk, SiteAnalytics } from "@/components/AnalyticsChoice";
import NoControlFocus from "@/components/NoControlFocus";
import NoSpaceScroll from "@/components/NoSpaceScroll";
import SoundPreload from "@/components/SoundPreload";
import CopyNotes from "@/features/devtools/copy/CopyNotes";
import { devUi } from "@/features/devtools/gate";
import Bubble from "@/features/messages/ui/Bubble";
import QuickRecord from "@/features/recorder/QuickRecord";
import Spotlight from "@/features/search/Spotlight";
import LoginGuard from "@/features/account/ui/LoginGuard";
import UserDataProvider from "@/features/userData/client/UserDataProvider";
import SaveNotice from "@/features/userData/client/SaveNotice";
import { THEME_BOOT } from "@/components/ThemeSwitcher";
import { SETTINGS_BOOT, Toasts } from "@/components/ui";
import { SITE_URL } from "@/lib/site";
import { APP_BACKGROUND } from "./manifest";

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
    default: "attunr: guitar and voice drills, theory and practice tools",
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
  /* installed to an iPhone's home screen: opens without Safari's bars, named attunr under the icon */
  appleWebApp: { capable: true, title: "attunr", statusBarStyle: "black" },
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
    title: "attunr: guitar and voice drills, theory and practice tools",
    description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  },
  twitter: {
    card: "summary_large_image",
    title: "attunr: guitar and voice drills, theory and practice tools",
    description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
  },
};

export const viewport: Viewport = {
  themeColor: APP_BACKGROUND,
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
        priceCurrency: "AUD",
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
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} ${styleFonts} antialiased`}
      >
        <NoControlFocus />
        <NoSpaceScroll />
        <SoundPreload />
        <UserDataProvider>
          {children}
          <QuickRecord />
          <Bubble />
          <Spotlight />
        </UserDataProvider>
        {/* once for every page, PageShell or not (the video studio has none) */}
        <SaveNotice />
        <Toasts />
        <LoginGuard />
        {devUi() && <CopyNotes />}
        {/* counting is held to the visitor's answer (lib/analyticsChoice.ts); in the EU they are asked first */}
        <AnalyticsAsk />
        <SiteAnalytics />
      </body>
    </html>
  );
}
