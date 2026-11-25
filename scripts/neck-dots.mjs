// Prints public/riff/neck-dots-a4.pdf and neck-dots-a3.pdf, one page each, for a colour-threshold reader to find
// (cheap, and a blurred or half-covered dot still has a centre): a calibration card twice, a long band of stripes down
// the page in each colour, and round dots. Each colour has a job; all are far in hue from skin, maple and rosewood (no red, orange,
// pink or yellow). Each dot has a thin white rim so it stands out on a dark board. Each line of dots is filled across
// the page, and lines are added until the page is full. Each strip of dots is one SVG, which keeps the PDF small.
//   node scripts/neck-dots.mjs
import { chromium } from "playwright";

// Lines of dots per kind of job, per sheet. A line is groups of [size mm, how many]; 0 fills the rest of the line.
// BASE lines come first; then EXTRA lines are added a round at a time (each colour's next one) until the page is full.
const BASE = {
  A4: {
    edge: [[[3, 0]]],
    mark: [],
    plain: [],
  },
  A3: {
    edge: [[[3, 0]], [[4, 0]], [[6, 0]]],
    mark: [[[3, 8], [4, 0]], [[6, 0]]],
    plain: [[[4, 0]], [[6, 0]]],
  },
};
// and every colour's big line: a few 20 mm for the main colours (the edges and the landmarks, the ones with stripes),
// a couple of 12 mm for the rest, the line filled with the next size down
const big = (c) => (c.main ? [[20, 4], [12, 0]] : [[12, 3], [8, 0]]);
const EXTRA = {
  edge: [[[8, 0]], [[10, 0]], [[5, 0]]],
  mark: [[[8, 0]], [[5, 0]], [[3, 0]]],
  plain: [[[8, 0]], [[3, 0]], [[6, 0]]],
};
const COLOURS = [
  { name: "Green", hex: "#00a651", kind: "edge", main: true, job: "near edge" },
  { name: "Cyan", hex: "#00aeef", kind: "edge", main: true, job: "far edge" },
  { name: "Magenta", hex: "#d6007f", kind: "mark", main: true, job: "nut and fret 12" },
  { name: "Lime", hex: "#7cc242", kind: "mark", job: "frets 5 and 17" },
  { name: "Violet", hex: "#7a3fc0", kind: "mark", job: "frets 7 and 19" },
  { name: "Blue", hex: "#1f4fd8", kind: "mark", job: "spare" },
  { name: "White", hex: "#ffffff", kind: "plain", job: "dark board" },
  { name: "Black", hex: "#111111", kind: "plain", job: "maple board" },
];
const RIM = 0.7; // mm of white round each dot
const GAP = 1.6; // mm between dots
const LABEL = 9, LABEL_GAP = 1.5, GROUP_GAP = 6; // mm
const step = (d) => d + 2 * RIM + GAP;

const SHEETS = [
  { file: "neck-dots-a4.pdf", format: "A4", w: 210, h: 297, margin: 9, stripes: [2, 3, 4], swatch: 7.5 },
  { file: "neck-dots-a3.pdf", format: "A3", w: 297, h: 420, margin: 10, stripes: [2, 3, 4, 5], swatch: 11 },
];

/** One size of one colour: a strip of dots, each a white disc with a dashed cut line and the colour inside. */
let ids = 0;
function strip(d, n, hex) {
  const id = `d${ids++}`;
  const r = d / 2 + RIM, step = 2 * r + GAP, w = n * step - GAP, h = 2 * r;
  const ring = hex === "#ffffff" ? ' stroke="#bbb" stroke-width="0.12"' : "";
  const one = `<g id="${id}"><circle r="${r}" fill="#fff" stroke="#999" stroke-width="0.12" stroke-dasharray="0.6 0.4"/><circle r="${d / 2}" fill="${hex}"${ring}/></g>`;
  const uses = Array.from({ length: n - 1 }, (_, i) => `<use href="#${id}" x="${(i + 1) * step}"/>`).join("");
  return `<svg width="${w}mm" height="${h}mm" viewBox="${-r} ${-r} ${w} ${h}"><defs>${one}</defs><use href="#${id}"/>${uses}</svg>`;
}

/** A line's groups with each 0 (fill) turned into as many dots as the width leaves. */
function fill(line, usable) {
  const fixed = line.reduce((t, [d, n]) => t + LABEL + LABEL_GAP + (n ? n * step(d) - GAP : 0), 0) + (line.length - 1) * GROUP_GAP;
  return line.map(([d, n]) => [d, n || Math.floor((usable - fixed - 1 + GAP) / step(d))]);
}

const STRIPE_COLOURS = ["Green", "Cyan", "Magenta"]; // the edges and the landmarks
const CUT = 0.8, BAND_GAP = 2.5, STRIPE_LABEL = 13, COLUMN_GAP = 5; // mm
const bandW = (widths) => widths.reduce((t, x) => t + x, 0) + (widths.length - 1) * CUT;
/** One colour's band down the page: strips of the given widths side by side, a thin white cut line between them. */
function band(widths, hex, h) {
  let x = 0;
  const rects = widths.map((w) => { const r = `<rect x="${x}" width="${w}" height="${h}" fill="${hex}"${hex === "#ffffff" ? ' stroke="#bbb" stroke-width="0.12"' : ""}/>`; x += w + CUT; return r; }).join("");
  return `<svg width="${x - CUT}mm" height="${h}mm" viewBox="0 0 ${x - CUT} ${h}">${rects}</svg>`;
}

function build(sheet, lines) {
  const banded = COLOURS.filter((c) => STRIPE_COLOURS.includes(c.name));
  const column = banded.length * (Math.max(bandW(sheet.stripes), 4) + BAND_GAP) - BAND_GAP;
  const usable = sheet.w - 2 * sheet.margin - column - COLUMN_GAP;
  const widths = sheet.stripes.join(", ").replace(/, (\d+)$/, " and $1");
  const tall = sheet.h - 2 * sheet.margin - STRIPE_LABEL - 2;
  const stripes = `<div class="stripes">${banded.map((c) => `<div class="band"><b>${c.name}</b>${band(sheet.stripes, c.hex, tall)}</div>`).join("")}</div>`;
  const sections = COLOURS.map((c, i) => {
    const rows = lines[i].map((line) => `<div class="line">${fill(line, usable).map(([d, n]) => `<span class="g"><b>${d} mm</b>${strip(d, n, c.hex)}</span>`).join("")}</div>`);
    return `<section><h2><i style="background:${c.hex}"></i>${c.name} <span>${c.job}</span></h2>${rows.join("")}</section>`;
  });

  const swatch = (hex, label) => `<div class="sw"><div style="background:${hex}"></div><span>${label}</span></div>`;
  const card = `<div class="card">${swatch("#ffffff", "White")}${swatch("#808080", "Grey")}${swatch("#000000", "Black")}${COLOURS.filter((c) => c.kind !== "plain").map((c) => swatch(c.hex, c.name)).join("")}</div>`;
  const cal = `<h2>Calibration <span>stick one by the neck, in view; the other is a spare</span></h2>
<div class="cal">${card}${card}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Neck dots ${sheet.format}</title><style>
@page { size: ${sheet.format}; margin: ${sheet.margin}mm; }
* { box-sizing: border-box; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 8.5pt -apple-system, Helvetica, Arial, sans-serif; color: #000; }
h1 { font-size: 13pt; margin-bottom: 1.5mm; }
p { margin-bottom: 0.8mm; }
.page { display: flex; gap: ${COLUMN_GAP}mm; align-items: flex-start; }
main { width: ${usable}mm; flex: none; }
h2 { font-size: 10pt; margin: 3.5mm 0 1.5mm; }
h2 i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; outline: 0.15mm solid #999; margin-right: 1.5mm; vertical-align: -0.3mm; }
h2 span { font-weight: normal; color: #444; font-size: 8pt; margin-left: 1.5mm; }
.line { display: flex; align-items: center; gap: ${GROUP_GAP}mm; margin-bottom: 1.6mm; }
.g { display: inline-flex; align-items: center; gap: ${LABEL_GAP}mm; }
.g b { font-weight: normal; font-size: 7.5pt; color: #444; white-space: nowrap; width: ${LABEL}mm; }
.g svg { display: block; }
.stripes { display: flex; gap: ${BAND_GAP}mm; flex: none; }
.band { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
.band b { font-weight: normal; font-size: 7pt; color: #444; writing-mode: vertical-rl; transform: rotate(180deg); height: ${STRIPE_LABEL - 1}mm; }
.band svg { display: block; }
.cal { display: flex; gap: 6mm; padding: 1mm; }
.card { display: flex; outline: 0.15mm dashed #999; outline-offset: 0.8mm; }
.sw { display: flex; flex-direction: column; align-items: center; gap: 0.6mm; font-size: 6.5pt; color: #444; }
.sw div { width: ${sheet.swatch}mm; height: ${sheet.swatch}mm; }
</style></head><body><div class="page"><main>
<h1>Neck dots · ${sheet.format}</h1>
<p>Print at 100% on matte sticker paper. Cut on the dashed lines, keeping the white rim. A size is the coloured part.</p>
<p>Stripes, right: ${widths} mm strips; cut along the white lines. The reader doesn't read these yet.</p>
${cal}
${sections.join("\n")}
</main>${stripes}</div>
</body></html>`;
}

const pagesOf = (pdf) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

const browser = await chromium.launch();
for (const sheet of SHEETS) {
  const page = await browser.newPage();
  const render = async (lines) => { await page.setContent(build(sheet, lines)); return page.pdf({ format: sheet.format, printBackground: true, preferCSSPageSize: true }); };
  const lines = COLOURS.map((c) => [...BASE[sheet.format][c.kind], big(c)]);
  let pdf = await render(lines);
  if (pagesOf(pdf) !== 1) throw new Error(`${sheet.file}: its BASE lines run past one page`);
  // add each colour's next extra line, a round at a time, until one more line would start a second page
  fill: for (let round = 0; ; round++) {
    let added = false;
    for (const [i, c] of COLOURS.entries()) {
      const extra = EXTRA[c.kind][round];
      if (!extra) continue;
      lines[i].push(extra);
      const next = await render(lines);
      if (pagesOf(next) !== 1) { lines[i].pop(); break fill; }
      pdf = next; added = true;
    }
    if (!added) break;
  }
  // then, from the bottom up, the biggest line that still fits in what is left
  for (let i = COLOURS.length - 1; i >= 0; i--) {
    for (const d of [12, 10, 8, 6]) {
      lines[i].push([[d, 0]]);
      if (pagesOf(await render(lines)) === 1) break;
      lines[i].pop();
    }
  }
  await page.setContent(build(sheet, lines));
  pdf = await page.pdf({ path: `public/riff/${sheet.file}`, format: sheet.format, printBackground: true, preferCSSPageSize: true });
  console.log(`${sheet.file}: ${pagesOf(pdf)} page, ${lines.reduce((t, l) => t + l.length, 0)} lines, ${(pdf.length / 1024).toFixed(0)} KB`);
  if (process.env.PREVIEW) {
    await page.emulateMedia({ media: "print" });
    await page.setViewportSize({ width: Math.round(sheet.w * 96 / 25.4), height: 800 });
    await page.screenshot({ path: `${process.env.PREVIEW}/${sheet.file}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
