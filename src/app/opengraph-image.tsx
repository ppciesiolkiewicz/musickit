import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* The link preview every page shares (WhatsApp, Messenger, Slack, X...). Pages
   bring their own title and description; this is the picture beside them. */

export const alt = "Music Kit: C major on a guitar fretboard, every note shown by its scale degree";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0f1115";
const BOARD = "#3a2a1f";
const FRET = "#c9b79c";
const STRING = "#d8d2c8";
const INK = "#f3f1ec";
const MUTED = "#a3a7b0";

/* one hue per scale degree, 1 to 7 */
const DEGREE = ["#e5484d", "#f08c3a", "#e5b93c", "#4fae6a", "#3e8fd8", "#5b63d6", "#9a5bd6"];

const STRINGS = [
  { name: "e", open: 4 },
  { name: "B", open: 11 },
  { name: "G", open: 7 },
  { name: "D", open: 2 },
  { name: "A", open: 9 },
  { name: "E", open: 4 },
];
const FRETS = [2, 3, 4, 5];
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];

/* TTFs from Google Fonts, the site's own faces. Fraunces is cut down to the
   letters of "Music Kit" (css2?...&text=); download it again if those change */
const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

const BOARD_W = 520;
const BOARD_H = 300;
const PAD_X = 24;
const PAD_Y = 28;
const DOT = 40;

export default async function Image() {
  const [fraunces, geist, geistBold] = await Promise.all([
    font("fraunces-wordmark.ttf"),
    font("geist-400.ttf"),
    font("geist-600.ttf"),
  ]);
  const cellW = (BOARD_W - PAD_X * 2) / FRETS.length;
  const rowH = (BOARD_H - PAD_Y * 2) / (STRINGS.length - 1);

  const dots = STRINGS.flatMap((s, row) =>
    FRETS.flatMap((fret, col) => {
      const degree = C_MAJOR.indexOf((s.open + fret) % 12);
      if (degree < 0) return [];
      return [{
        key: `${row}-${fret}`,
        left: PAD_X + cellW * (col + 0.5) - DOT / 2,
        top: PAD_Y + rowH * row - DOT / 2,
        degree,
      }];
    }),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 72px",
          background: BG,
          color: INK,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#e5b93c", textTransform: "uppercase" }}>
            Guitar theory &amp; practice
          </div>
          <div
            style={{
              fontSize: 112,
              lineHeight: 1,
              marginTop: 20,
              fontFamily: "Fraunces",
              fontWeight: 600,
            }}
          >
            Music Kit
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.35, marginTop: 28, color: MUTED }}>
            Scales in every key, chord shapes, CAGED, a tuner and a looper.
          </div>
          <div style={{ display: "flex", marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                padding: "14px 28px",
                borderRadius: 999,
                background: "#e5b93c",
                color: BG,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              Start practising free →
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              width: BOARD_W,
              height: BOARD_H,
              background: BOARD,
              borderRadius: 18,
            }}
          >
            {FRETS.map((_, i) => (
              <div
                key={`f${i}`}
                style={{
                  position: "absolute",
                  left: PAD_X + cellW * i - 2,
                  top: PAD_Y - 10,
                  width: 4,
                  height: BOARD_H - PAD_Y * 2 + 20,
                  background: FRET,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: BOARD_W - PAD_X - 2,
                top: PAD_Y - 10,
                width: 4,
                height: BOARD_H - PAD_Y * 2 + 20,
                background: FRET,
              }}
            />
            {STRINGS.map((s, row) => (
              <div
                key={s.name + row}
                style={{
                  position: "absolute",
                  left: PAD_X - 10,
                  top: PAD_Y + rowH * row - (1 + row * 0.3),
                  width: BOARD_W - PAD_X * 2 + 20,
                  height: 2 + row * 0.6,
                  background: STRING,
                }}
              />
            ))}
            {dots.map((d) => (
              <div
                key={d.key}
                style={{
                  position: "absolute",
                  left: d.left,
                  top: d.top,
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT,
                  background: DEGREE[d.degree],
                  border: "3px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {d.degree === 0 ? "R" : String(d.degree + 1)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 20, color: MUTED }}>
            C major, frets 2–5, every note by its scale degree
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "Geist", data: geist, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 600, style: "normal" },
      ],
    },
  );
}
