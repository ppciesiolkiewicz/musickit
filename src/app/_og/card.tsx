import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";

/* A public page's link preview: the wordmark and the page's name over its title on the left, a drawing (art.tsx) on the
   right. Colours and faces as the site's own preview, src/app/opengraph-image.tsx. Each page's opengraph-image.tsx calls
   this; share.ts puts the page's title and address beside it in the page's metadata. */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const BG = "#0f1115";
export const INK = "#f3f1ec";
export const MUTED = "#a3a7b0";
export const GOLD = "#e5b93c";
/* one hue per scale degree, 1 to 7, as the site's preview */
export const DEGREE = ["#e5484d", "#f08c3a", "#e5b93c", "#4fae6a", "#3e8fd8", "#5b63d6", "#9a5bd6"];

const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

type Card = {
  /** the page's name, small and gold beside the wordmark */
  eyebrow: string;
  title: string;
  /** the page's address after attunr.app, "/learn" */
  path: string;
  /** a drawing that fills a 460×460 square */
  art: ReactNode;
};

export async function shareCard({ eyebrow, title, path, art }: Card) {
  const [outfit, geist, geistBold] = await Promise.all([font("outfit-wordmark.ttf"), font("geist-400.ttf"), font("geist-600.ttf")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 64px 0 72px", background: BG, color: INK, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 580, height: 502 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 44, fontFamily: "Outfit", fontWeight: 600, letterSpacing: -1 }}>attunr</div>
            <div style={{ fontSize: 22, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginLeft: 24 }}>{eyebrow}</div>
          </div>
          <div style={{ display: "flex", fontSize: title.length > 34 ? 60 : 72, lineHeight: 1.08, fontWeight: 600, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{`attunr.app${path}`}</div>
            <div style={{ display: "flex" }}>
              {DEGREE.map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 16, background: c, marginLeft: 9 }} />)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", width: 460, height: 460 }}>{art}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Outfit", data: outfit, weight: 600, style: "normal" },
        { name: "Geist", data: geist, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 600, style: "normal" },
      ],
    },
  );
}
