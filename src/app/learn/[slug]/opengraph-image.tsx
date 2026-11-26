import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ARTICLES, articleOf } from "@/features/articles";

/* An article's link preview: its title and intro, and on a singing article the line that says you sing it on the page.
   Built once per article at build time (`generateStaticParams`). Colours and faces as the site's own preview,
   src/app/opengraph-image.tsx. */

export const alt = "A guide from attunr: short practice with exercises on the page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const generateStaticParams = () => ARTICLES.map((a) => ({ slug: a.slug }));

const BG = "#0f1115";
const INK = "#f3f1ec";
const MUTED = "#a3a7b0";
const GOLD = "#e5b93c";
/* one hue per scale degree, 1 to 7, as the site's preview */
const DEGREE = ["#e5484d", "#f08c3a", "#e5b93c", "#4fae6a", "#3e8fd8", "#5b63d6", "#9a5bd6"];

const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleOf((await params).slug);
  const [outfit, geist, geistBold] = await Promise.all([font("outfit-wordmark.ttf"), font("geist-400.ttf"), font("geist-600.ttf")]);
  const title = a?.title ?? "Learn";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: BG, color: INK, fontFamily: "Geist" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 44, fontFamily: "Outfit", fontWeight: 600, letterSpacing: -1 }}>attunr</div>
          <div style={{ fontSize: 22, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginLeft: 24 }}>Learn</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 48 ? 64 : 76, lineHeight: 1.08, fontWeight: 600, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
          {a && <div style={{ fontSize: 30, lineHeight: 1.35, marginTop: 24, color: MUTED, maxWidth: 960 }}>{a.intro}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {a?.sings ? (
            <div style={{ display: "flex", padding: "14px 28px", borderRadius: 999, background: GOLD, color: BG, fontSize: 26, fontWeight: 600 }}>
              Sing along on the page, your pitch drawn live
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 26, color: MUTED }}>attunr.app/learn</div>
          )}
          <div style={{ display: "flex" }}>
            {DEGREE.map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 18, background: c, marginLeft: 10 }} />)}
          </div>
        </div>
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
