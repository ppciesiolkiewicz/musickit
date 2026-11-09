import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* The attunr logo as an image: the wordmark with its seven scale-degree dots,
   light on the given ground ("transparent" for none). Outfit is the cut-down
   wordmark face in this folder. */

const INK = "#f3f1ec";
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];

export async function logoImage(background: string) {
  const outfit = await readFile(join(process.cwd(), "src/app/_og/outfit-wordmark.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background }}>
        <div style={{ fontSize: 180, lineHeight: 1, fontFamily: "Outfit", fontWeight: 600, letterSpacing: -5, color: INK }}>attunr</div>
        <div style={{ display: "flex", marginTop: 26 }}>
          {DOTS.map((c, i) => (
            <div key={c} style={{ width: 30, height: 30, borderRadius: 30, background: c, marginLeft: i === 0 ? 0 : 16 }} />
          ))}
        </div>
      </div>
    ),
    { width: 800, height: 300, fonts: [{ name: "Outfit", data: outfit, weight: 600, style: "normal" }] },
  );
}
