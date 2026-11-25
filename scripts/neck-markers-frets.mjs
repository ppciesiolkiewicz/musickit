// Prints public/riff/neck-markers-frets-a3.pdf: ArUco markers (ARUCO_MIP_36h12) sized to sit one per fret.
// Ids start after the A3 sheet's (0-50), so
// markers from both sheets can be used together. Every marker is checked to decode with js-aruco2 before printing.
//   node scripts/neck-markers-frets.mjs
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { AR } = require("js-aruco2");

const FIRST_ID = 51;
// black square, mm. A group of several sizes shares one row: few players put markers that high up the neck.
const GROUPS = [[40], [30], [24], [22], [20], [18], [16, 14, 12]];
const TEST_SIZE = 30; // this size and up are wider than any fret, for testing: one row
const SCALE = 648; // 25.5" scale, mm
const PAGE = { w: 297, h: 420, margin: 10 };
const GAP = 3; // mm between pieces

const dict = new AR.Dictionary("ARUCO_MIP_36h12");
const fretWidth = (f) => SCALE * (2 ** (-(f - 1) / 12) - 2 ** (-f / 12));
/** Highest wire a piece can be centred on with a neighbour on each next wire: the narrower fret beside it is at least as wide as the piece. */
const upToWire = (piece) => { if (fretWidth(1) < piece) return 0; let f = 1; while (fretWidth(f + 1) >= piece) f++; return f; };

function markerSvg(id) {
  const code = dict.codeList[id];
  let rects = "";
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++)
    if (code[y * 6 + x] === "1") rects += `<rect x="${x + 2}" y="${y + 2}" width="1.02" height="1.02" fill="#fff"/>`;
  // 10 cells: one white, eight black (border + 6 data), one white
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" shape-rendering="crispEdges"><rect width="10" height="10" fill="#fff"/><rect x="1" y="1" width="8" height="8" fill="#000"/>${rects}</svg>`;
}

/** Decode the marker drawn at 10 px a cell, as the detector would see it. */
function decodes(id) {
  const cell = 10, n = 14 * cell; // 2 extra white cells around
  const data = new Uint8ClampedArray(n * n * 4).fill(255);
  const code = dict.codeList[id];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const black = x >= 1 && x <= 8 && y >= 1 && y <= 8 && !(x >= 2 && x <= 7 && y >= 2 && y <= 7 && code[(y - 2) * 6 + (x - 2)] === "1");
    if (!black) continue;
    for (let py = 0; py < cell; py++) for (let px = 0; px < cell; px++) {
      const i = (((y + 2) * cell + py) * n + (x + 2) * cell + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  const found = new AR.Detector({ dictionaryName: "ARUCO_MIP_36h12" }).detect({ width: n, height: n, data });
  return found.some((m) => m.id === id);
}

let id = FIRST_ID, y = 0;
const usable = PAGE.w - 2 * PAGE.margin;
const sections = [];
const HEADER = 30, LABEL = 4, HEAD = 7; // mm
let room = PAGE.h - 2 * PAGE.margin - HEADER;
const piece = (s) => s * 1.25; // with the white edge
const plan = GROUPS.map((sizes) => {
  // the same number of each size in a row, as many as fit
  const set = sizes.reduce((t, s) => t + piece(s) + GAP, 0);
  const each = Math.floor((usable + GAP) / set);
  return { sizes, ph: piece(sizes[0]) + LABEL, row: sizes.flatMap((s) => Array(each).fill(s)) };
});
// rows per group: one each, then fill what's left with the one-size groups, largest first
const rows = plan.map(() => 1);
const used = () => plan.reduce((t, p, i) => t + HEAD + rows[i] * (p.ph + GAP), 0);
for (let grew = true; grew;) {
  grew = false;
  for (let i = 0; i < plan.length; i++) if (plan[i].sizes.length === 1 && plan[i].sizes[0] < TEST_SIZE && used() + plan[i].ph + GAP <= room) { rows[i]++; grew = true; }
}
const fits = (s) => upToWire(piece(s))
  ? `fret ${upToWire(piece(s))}`
  : null;
for (const [i, p] of plan.entries()) {
  const items = [];
  for (let r = 0; r < rows[i]; r++) for (const s of p.row) {
    if (!decodes(id)) throw new Error(`marker ${id} does not decode`);
    items.push(`<div class="piece" style="width:${piece(s)}mm"><div class="cut" style="width:${piece(s)}mm;height:${piece(s)}mm">${markerSvg(id)}</div><div class="label">${id} · ${s} mm</div></div>`);
    id++;
  }
  const names = p.sizes.join(", ").replace(/, (\d+)$/, " and $1");
  const note = p.sizes.length > 1
    ? `fit a marker on every fret wire up to frets ${p.sizes.map((s) => upToWire(piece(s))).join(", ").replace(/, (\d+)$/, " and $1")}, in that order`
    : fits(p.sizes[0])
      ? `fits a marker on every fret wire up to ${fits(p.sizes[0])}`
      : "wider than the first fret: for the headstock or the body, or to test how far away the camera reads it";
  sections.push(`<h2>${names} mm <span>${note}</span></h2><div class="row" style="gap:${GAP}mm;align-items:flex-end">${items.join("")}</div>`);
}
y = used();

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Neck markers for frets A3</title><style>
@page { size: A3; margin: ${PAGE.margin}mm; }
* { box-sizing: border-box; margin: 0; }
body { font: 9pt -apple-system, Helvetica, Arial, sans-serif; color: #000; }
h1 { font-size: 13pt; margin-bottom: 2mm; }
p { margin-bottom: 1mm; }
h2 { font-size: 10pt; height: ${HEAD}mm; padding-top: 2mm; }
h2 span { font-weight: normal; color: #444; margin-left: 2mm; }
.row { display: flex; flex-wrap: wrap; row-gap: ${GAP}mm; }
.cut { outline: 0.2mm dashed #888; display: flex; flex-direction: column; }
.cut svg { display: block; width: 100%; }
.label { height: ${LABEL}mm; font-size: 6.5pt; color: #444; text-align: center; padding-top: 0.5mm; }
.head { height: ${HEADER}mm; }
</style></head><body>
<div class="head">
<h1>Neck markers for frets (ARUCO_MIP_36h12) · A3</h1>
<p>Print at 100% ("Actual size") on matte paper, or better on matte sticker paper or thin card. Measure one black square: it should match its size.</p>
<p>Cut on the dashed line. Keep the white edge round the black square.</p>
<p>Centre each marker on a fret wire. The note after each size says how far up the neck that size still fits with a marker on every wire. Ids carry on from the A3 sheet (0–50), so each id is on one sheet only.</p>
</div>
${sections.join("\n")}
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: "public/riff/neck-markers-frets-a3.pdf", format: "A3", printBackground: true, preferCSSPageSize: true });
const pages = await page.evaluate(() => Math.ceil(document.body.scrollHeight / (420 * 96 / 25.4)));
await browser.close();
console.log(`markers ${FIRST_ID}-${id - 1}, ${y.toFixed(0)} mm of ${room} mm used, ~${pages} page(s)`);
