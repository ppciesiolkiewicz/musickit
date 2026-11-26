import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ARTICLES, articleOf } from "@/features/articles";
import { articleArt } from "@/features/articles/art";

/* An article's link preview: its picture (features/articles/art.ts, the one on its card and over its body) across the top,
   then its title, and on a singing article the line that says you sing it on the page.
   Built once per article at build time (`generateStaticParams`). Colours and faces as the site's own preview,
   src/app/opengraph-image.tsx. */

export const alt = "A guide from attunr: short practice with exercises on the page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const generateStaticParams = () => ARTICLES.map((a) => ({ slug: a.slug }));

const BG = "#0f1115";
const INK = "#f3f1ec";
const GOLD = "#e5b93c";
/* one hue per scale degree, 1 to 7, as the site's preview */
const DEGREE = ["#e5484d", "#f08c3a", "#e5b93c", "#4fae6a", "#3e8fd8", "#5b63d6", "#9a5bd6"];

const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleOf((await params).slug);
  const [outfit, geist, geistBold] = await Promise.all([font("outfit-wordmark.ttf"), font("geist-400.ttf"), font("geist-600.ttf")]);
  const title = a?.title ?? "Learn";
  const art = a ? `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "public", articleArt(a.slug)))).toString("base64")}` : null;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, fontFamily: "Geist" }}>
        {art && <img src={art} width={1200} height={480} alt="" />}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexGrow: 1, padding: "0 56px" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
            <div style={{ fontSize: title.length > 44 ? 36 : 42, lineHeight: 1.12, fontWeight: 600, letterSpacing: -0.8 }}>{title}</div>
            {a?.sings && <div style={{ fontSize: 22, marginTop: 8, color: GOLD }}>Sing along on the page, your pitch drawn live</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 40, fontFamily: "Outfit", fontWeight: 600, letterSpacing: -1 }}>attunr</div>
            <div style={{ display: "flex", marginTop: 8 }}>
              {DEGREE.map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: 10, background: c, marginLeft: 6 }} />)}
            </div>
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
