import type { MetadataRoute } from "next";

/* the default style's page colour (slate-950 in themes.css), so the splash and the status bar match the first screen */
export const APP_BACKGROUND = "#020617";

/** The web app manifest: what a phone or computer needs to install attunr as an app. Icons come from `npm run brand`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "attunr",
    short_name: "attunr",
    description: "Guitar theory, exercises and practice tools: scales and modes in every key, chord shapes, CAGED, a tuner and a looper.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["music", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
