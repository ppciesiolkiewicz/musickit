// Prints public/riff/neck-dots-strat-big-a3.pdf: a kit for a 25.5" neck (Squier Strat or Tele) with two big dots for each
// fret space, one for the lower half of the board and one for the upper, each as big as its fret space allows (70% of it,
// 7 to 20 mm) and labelled with its fret and its distance from the nut. Lower is green and upper cyan, as the near and far
// edge in neck-dots.mjs; the landmark frets are in their colour on both (magenta the nut and 12, lime 5 and 17, violet 7
// and 19). As many full kits as fit on one A3 page, then a calibration card.
//   node scripts/neck-dots-big.mjs
import { chromium } from "playwright";

const RIM = 0.7, GAP = 1.6; // mm of white round each dot, mm between dots
const HEX = { Green: "#00a651", Cyan: "#00aeef", Magenta: "#d6007f", Lime: "#7cc242", Violet: "#7a3fc0", Blue: "#1f4fd8" };
const LANDMARK = { 0: "Magenta", 12: "Magenta", 5: "Lime", 17: "Lime", 7: "Violet", 19: "Violet" };
const SCALE_MM = 648, FRETS = 22, NUT_DOT = 10;
const wire = (n) => SCALE_MM * (1 - 2 ** (-n / 12)); // nut to fret wire n
const places = Array.from({ length: FRETS + 1 }, (_, n) => {
  if (n === 0) return { n, mid: 0, d: NUT_DOT };
  const space = wire(n) - wire(n - 1);
  return { n, mid: (wire(n - 1) + wire(n)) / 2, d: Math.min(20, Math.max(7, Math.floor(space * 0.7))) };
});

/** One dot: a white disc with a dashed cut line and the colour inside. */
function dot(d, hex) {
  const r = d / 2 + RIM;
  return `<svg width="${2 * r}mm" height="${2 * r}mm" viewBox="${-r} ${-r} ${2 * r} ${2 * r}"><circle r="${r}" fill="#fff" stroke="#999" stroke-width="0.12" stroke-dasharray="0.6 0.4"/><circle r="${d / 2}" fill="${hex}"/></svg>`;
}

function kitPage(kits) {
  const W = 297, M = 10, usable = W - 2 * M;
  const cell = (p, edge) => `<div class="k"><div class="kd">${dot(p.d, HEX[LANDMARK[p.n] ?? edge])}</div><b>${p.n === 0 ? "nut" : p.n}</b><span>${p.n === 0 ? "" : `${p.mid.toFixed(0)} mm`}</span></div>`;
  const row = (edge) => `<div class="krow">${places.map((p) => cell(p, edge)).join("")}</div>`;
  const head = (hex, label) => `<h2><i style="background:${hex}"></i>${label}</h2>`;
  const kit = (i) => `<section>${head(HEX.Green, `Kit ${i + 1} · lower`)}${row("Green")}${head(HEX.Cyan, `Kit ${i + 1} · upper`)}${row("Cyan")}</section>`;
  const swatch = (hex, label) => `<div class="sw"><div style="background:${hex}"></div><span>${label}</span></div>`;
  const card = `<div class="card">${swatch("#ffffff", "White")}${swatch("#808080", "Grey")}${swatch("#000000", "Black")}${Object.entries(HEX).map(([name, hex]) => swatch(hex, name)).join("")}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Neck dots Strat big kit</title><style>
@page { size: A3; margin: ${M}mm; }
* { box-sizing: border-box; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 8.5pt -apple-system, Helvetica, Arial, sans-serif; color: #000; width: ${usable}mm; }
h1 { font-size: 13pt; margin-bottom: 1.5mm; }
h2 { font-size: 10pt; margin: 3mm 0 1.5mm; }
h2 i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; margin-right: 1.5mm; vertical-align: -0.3mm; }
section { break-inside: avoid; }
.krow { display: flex; flex-wrap: wrap; gap: 2mm ${GAP}mm; align-items: flex-end; margin-bottom: 1mm; }
.k { display: flex; flex-direction: column; align-items: center; min-width: 9mm; }
.k svg { display: block; }
.k b { font-size: 8pt; margin-top: 0.5mm; }
.k span { font-size: 6.5pt; color: #444; height: 2.6mm; }
.card { display: inline-flex; outline: 0.15mm dashed #999; outline-offset: 0.8mm; margin: 1mm; }
.sw { display: flex; flex-direction: column; align-items: center; gap: 0.6mm; font-size: 6.5pt; color: #444; }
.sw div { width: 11mm; height: 11mm; }
</style></head><body>
<h1>Neck dots · Strat big kit (25.5″) · A3</h1>
<p>Print at 100% on matte sticker paper. Two dots for each fret space: one in the lower half of the board, one in the upper. Under each dot: its fret, and mm from the nut to the middle of the fret space.</p>
${Array.from({ length: kits }, (_, i) => kit(i)).join("")}
<h2>Calibration</h2>
${card}
</body></html>`;
}

const pagesOf = (pdf) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (kits) => { await page.setContent(kitPage(kits)); return page.pdf({ format: "A3", printBackground: true, preferCSSPageSize: true }); };
let kits = 1;
while (pagesOf(await render(kits + 1)) === 1) kits++;
await page.setContent(kitPage(kits));
const pdf = await page.pdf({ path: "public/riff/neck-dots-strat-big-a3.pdf", format: "A3", printBackground: true, preferCSSPageSize: true });
console.log(`neck-dots-strat-big-a3.pdf: ${pagesOf(pdf)} page, ${kits} kits, sizes ${places.map((p) => p.d).join(" ")} mm, ${(pdf.length / 1024).toFixed(0)} KB`);
await browser.close();
