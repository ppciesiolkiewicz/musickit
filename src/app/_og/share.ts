import type { Metadata } from "next";
import { alt, size } from "@/app/opengraph-image";

/**
 * A public page's link preview (WhatsApp, Slack, X...): its own title, description and address. A page that sets no
 * `openGraph` shows the site's title and the home page's address, and one that sets it shows no picture unless one is
 * given here or drawn beside it, so every public page spreads this into its metadata.
 *
 * The picture: a page with an `opengraph-image.tsx` beside it (drawn with card.tsx) leaves `sitePicture` off, since
 * `images` here would win over that file. A page without one sets `sitePicture` to show the site's. Twitter's picture
 * follows the Open Graph one.
 */
export function shareMeta({ path, title, description, type = "website", sitePicture = false }: { path: string; title: string; description: string; type?: "website" | "profile"; sitePicture?: boolean }): Pick<Metadata, "openGraph" | "twitter"> {
  // no `images` key at all without the site picture: even an undefined one hides the page's own file
  const images = sitePicture ? { images: [{ url: "/opengraph-image", width: size.width, height: size.height, alt }] } : {};
  return {
    openGraph: { type, siteName: "attunr", locale: "en_US", url: path, title, description, ...images },
    twitter: { card: "summary_large_image", title, description },
  };
}
