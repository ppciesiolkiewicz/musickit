import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* The attunr logo as a plain image at /logo.png: the wordmark with its seven
   scale-degree dots, light on a transparent ground (for dark backgrounds).
   Prerendered at build time. Outfit is the cut-down wordmark face in _og. */

export const dynamic = "force-static";

const WIDTH = 800;
const HEIGHT = 300;
const INK = "#f3f1ec";
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];

export async function GET() {
  const outfit = await readFile(join(process.cwd(), "src/app/_og/outfit-wordmark.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 180, lineHeight: 1, fontFamily: "Outfit", fontWeight: 600, letterSpacing: -5, color: INK }}>attunr</div>
        <div style={{ display: "flex", marginTop: 26 }}>
          {DOTS.map((c, i) => (
            <div key={c} style={{ width: 30, height: 30, borderRadius: 30, background: c, marginLeft: i === 0 ? 0 : 16 }} />
          ))}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts: [{ name: "Outfit", data: outfit, weight: 600, style: "normal" }] },
  );
}
