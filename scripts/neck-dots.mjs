// Prints public/riff/neck-dots-a4.pdf and neck-dots-a3.pdf, one page each, and neck-dots-strat-a3.pdf (below), for a colour-threshold reader to find
// (cheap, and a blurred or half-covered dot still has a centre): a calibration card twice, a long band of stripes down
// the page in each colour, and round dots. Each colour has a job; all are far in hue from skin, maple and rosewood (no red, orange,
// pink or yellow). Each dot has a thin white rim so it stands out on a dark board. Each line of dots is filled across
// the page, and lines are added until the page is full. Each strip of dots is one SVG, which keeps the PDF small.
//   node scripts/neck-dots.mjs
import { chromium } from "playwright";

// Lines of dots per kind of job, per sheet. A line is groups of [size mm, how many]; 0 fills the rest of the line.
// BASE lines come first; then EXTRA lines are added a round at a time (each colour's next one) until the page is full.
const BASE = {
  A4: { edge: [[[5, 0]]], mark: [], plain: [] },
  A3: { edge: [[[5, 0]]], mark: [[[5, 0]]], plain: [] },
};
// and every colour's big line: a few 20 mm for the main colours (the edges and the landmarks, the ones with stripes),
// a couple of 12 mm for the rest, two each of 3 and 4 mm to try under a note, the line filled with the next size down
const big = (c) => (c.main ? [[20, 3], [3, 2], [4, 2], [12, 0]] : [[12, 3], [3, 2], [4, 2], [8, 0]]);
const EXTRA = {
  edge: [[[8, 0]], [[6, 0]], [[10, 0]]],
  mark: [[[8, 0]], [[6, 0]], [[10, 0]]],
  plain: [[[8, 0]], [[6, 0]], [[10, 0]]],
};
const COLOURS = [
  { name: "Green", hex: "#00a651", kind: "edge", main: true, job: "near edge" },
  { name: "Cyan", hex: "#00aeef", kind: "edge", main: true, job: "far edge" },
  { name: "Magenta", hex: "#d6007f", kind: "mark", main: true, job: "nut and fret 12" },
  { name: "Lime", hex: "#7cc242", kind: "mark", job: "frets 5 and 17" },
  { name: "Violet", hex: "#7a3fc0", kind: "mark", job: "frets 7 and 19" },
  { name: "Blue", hex: "#1f4fd8", kind: "mark", main: true, job: "bridge" },
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
  return line.map(([d, n]) => [d, n || Math.floor((usable - fixed - 1 + GAP) / step(d))]).filter(([, n]) => n > 0);
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
// The Strat kit (A3): a dot in each fret space on both edges, green and magenta taking turns so each fret has one of each
// (the top edge, low E side, green at odd frets; the bottom green at even), a small and a big set; and a line right across the board beside each wire (under the strings, on the body side, touching the wire),
// on the wires at the inlay frets only, for the fret's angle and the strings a hand covers; each is labelled with where it goes.
const SCALE_MM = 648, FRETS = 22;
const wire = (n) => SCALE_MM * (1 - 2 ** (-n / 12)); // nut to fret wire n
const byName = Object.fromEntries(COLOURS.map((c) => [c.name, c]));
// spare colours: lime left out, too near green
const SPARE_COLOURS = ["Green", "Magenta", "Cyan", "Violet", "Blue", "White", "Black"].map((n) => byName[n].hex);
const GREEN = byName.Green.hex, MAGENTA = byName.Magenta.hex, BRIDGE_DOT = 16;
const spaces = Array.from({ length: FRETS }, (_, i) => {
  const n = i + 1, space = wire(n) - wire(n - 1);
  return { n, mid: (wire(n - 1) + wire(n)) / 2, small: Math.min(8, Math.max(5, Math.floor(space * 0.4))), big: Math.min(20, Math.floor(space * 0.7)) };
});
// lines only on the wires at the inlay frets; each sticker unlike the others, so one seen says which wire it is: the colour is
// the part of the neck, how many lines is which mark in that part
const LINES = [[0, "Blue", 1], [3, "Magenta", 1], [5, "Magenta", 2], [7, "Cyan", 1], [9, "Cyan", 2], [12, "Cyan", 3], [15, "Violet", 1], [17, "Violet", 2], [19, "Violet", 3]];
const ZONES = [["Blue", "nut (fretboard side)"], ["Magenta", "wires 3 and 5"], ["Cyan", "7, 9 and 12"], ["Violet", "15, 17 and 19"]];
const LINE_W = 2, LINE_GAP = 1.5; // mm
// board width at a place along it: a straight taper, about 42 mm at the nut to 56 mm at fret 22 (Squier Strat and Tele)
const NUT_W = 42, WIDTH_AT_22 = 56.4;
const boardAt = (mm) => NUT_W + ((WIDTH_AT_22 - NUT_W) * mm) / wire(22);
/** The line on wire w: 2 mm short of the board's width there, so its ends stay off the rolled edges. */
const lineLen = (w) => Math.round(boardAt(wire(w)) - 2);

/** One line sticker, lying along the page: the lines printed at one full length (FULL_LINE) so a longer one can be cut, and the
 * dashed cut line round the length for its wire, from the left end. */
const FULL_LINE = 60; // mm, longer than the board is wide anywhere
function line(hexes, len) {
  const w = FULL_LINE + 2 * RIM, h = hexes.length * LINE_W + (hexes.length - 1) * LINE_GAP + 2 * RIM, x = 0; // the frame starts at the left end
  const rects = hexes.map((hex, i) => `<rect x="${RIM}" y="${RIM + i * (LINE_W + LINE_GAP)}" width="${FULL_LINE}" height="${LINE_W}" fill="${hex}"/>`).join("");
  return `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${rects}<rect x="${x + 0.06}" y="0.06" width="${len + 2 * RIM - 0.12}" height="${h - 0.12}" rx="0.6" fill="none" stroke="#333" stroke-width="0.15" stroke-dasharray="0.8 0.5"/></svg>`;
}

// Fret covers, for testing: one sticker filling a whole fret space (wire to wire, edge to edge), cut into colour zones
// across the board, each zone a band running along the neck under one string (low E on the left); every cover the same
const COVERS = [1, 3, 5, 7, 12];
const COVER_COLOURS = ["Green", "Violet", "Cyan", "Magenta", "Blue", "White"];
const WIRE_W = 2.5; // mm of fret wire taken off the space's length
/** Fret n's cover, lying as on the neck seen from the player (across the board left to right, nut at the top): the board's
 * width at the space's body end by the space less a wire, the zones side by side, a dashed cut line round it. */
function cover(n, zones = COVER_COLOURS.length) {
  const w = Math.round(boardAt(wire(n))), h = Math.round(wire(n) - wire(n - 1) - WIRE_W), z = w / zones;
  const rects = COVER_COLOURS.slice(0, zones).map((c, i) => `<rect x="${i * z}" width="${z + 0.05}" height="${h}" fill="${byName[c].hex}"/>`).join("");
  return { w, h, svg: `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${rects}<rect x="0.06" y="0.06" width="${w - 0.12}" height="${h - 0.12}" fill="none" stroke="#333" stroke-width="0.15" stroke-dasharray="0.8 0.5"/></svg>` };
}

function kitPage(spareLines, sparesOnly = false) {
  const W = 297, M = 10, usable = W - 2 * M;
  const cell = (svg, d, top, bottom) => `<div class="k" style="width:${Math.max(10.6, d + 1.2)}mm"><div class="kd" style="height:${Math.max(10.5, d + 0.5)}mm">${svg}</div><b>${top}</b><span>${bottom}</span></div>`;
  // top edge: green at odd frets, magenta at even; bottom edge the other way round, so each fret has one of each
  const dotCell = (p, size, top) => cell(strip(p[size], 1, (p.n % 2 === 1) === top ? GREEN : MAGENTA), p[size] + 2 * RIM, p.n === 0 ? "nut" : p.n, p.n === 0 ? "headstock" : `${p.mid.toFixed(0)} mm`);
  const cellW = (d) => Math.max(10.6, d + 2 * RIM + 1.2) + 0.4; // a cell and the gap after it
  // what is left of a row filled with unlabelled spare dots, green and magenta in turn
  const fillRest = (used, d = 8) => {
    const n = Math.max(0, Math.floor((usable - used - 3) / step(d)));
    return n ? `<div class="kfill">${Array.from({ length: n }, (_, i) => strip(d, 1, i % 2 ? MAGENTA : GREEN)).join("")}</div>` : "";
  };
  const row = (cells) => {
    const used = cells.reduce((t, [p, size]) => t + cellW(p[size]), 0);
    return `<div class="krow">${cells.map(([p, size, top]) => dotCell(p, size, top)).join("")}${fillRest(used)}</div>`;
  };
  // fret 0: on the headstock, its edge on the nut
  const nut = { n: 0, small: 8, big: 16 };
  const along = (size, top, from, to) => [nut, ...spaces].filter((p) => p.n >= from && p.n <= to).map((p) => [p, size, top]);
  // small: one row per edge, nut to 22; big: nut to 12 a row per edge, then 13-22 of both edges on one row
  const dotRows = [row(along("small", true, 0, 22)), row(along("small", false, 0, 22)), row(along("big", true, 0, 12)), row(along("big", false, 0, 12)),
    row([...along("big", true, 13, 22), ...along("big", false, 13, 22)])].join("");
  const lineSet = (hex) => `<div class="lines">${LINES.map(([w, n, count]) => `<div class="ln"><b>${w === 0 ? "nut" : w}</b><span>${wire(w).toFixed(0)} mm</span>${line(Array(count).fill(hex ?? byName[n].hex), lineLen(w))}<span>${lineLen(w)} mm</span></div>`).join("")}</div>`;
  const swatch = (hex, label) => `<div class="sw"><div style="background:${hex}"></div><span>${label}</span></div>`;
  const card = `<div class="card">${[["#ffffff", "White"], ["#808080", "Grey"], ["#000000", "Black"], ...["Green", "Magenta", "Cyan", "Violet", "Blue"].map((n) => [byName[n].hex, n])].map(([hex, n]) => swatch(hex, n)).join("")}</div>`;
  // a spare line is one size across the whole width, the dots shared out between the spare colours
  const across = (d) => Math.floor((usable - LABEL - LABEL_GAP + GAP - 1) / step(d));
  const spares = spareLines.map(([d]) => {
    const n = across(d), k = SPARE_COLOURS.length;
    return `<div class="line sp"><b>${d} mm</b>${SPARE_COLOURS.map((hex, i) => (n / k | 0) + (i < n % k ? 1 : 0)).map((m, i) => (m ? strip(d, m, SPARE_COLOURS[i]) : "")).join("")}</div>`;
  }).join("");
  const zones = ZONES.map(([n, where]) => `<i style="background:${byName[n].hex}"></i>${where}`).join(" &nbsp; ");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Neck dots Strat kit</title><style>
@page { size: A3; margin: ${M}mm; }
* { box-sizing: border-box; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 6.5pt -apple-system, Helvetica, Arial, sans-serif; color: #000; width: ${usable}mm; }
h1 { font-size: 10pt; margin-bottom: 0.8mm; }
h2 { font-size: 7.5pt; margin: 1.8mm 0 0.8mm; }
h2 span { font-weight: normal; color: #444; font-size: 6.5pt; margin-left: 1.5mm; }
h2 i { display: inline-block; width: 2.2mm; height: 2.2mm; border-radius: 50%; margin-right: 1mm; vertical-align: -0.3mm; }
.krow { display: flex; flex-wrap: wrap; gap: 1mm 0.4mm; align-items: flex-end; margin-bottom: 1mm; }
.k { display: flex; flex-direction: column; align-items: center; }
.kd { display: flex; align-items: flex-end; }
.k svg, .g svg { display: block; }
.kfill { display: flex; gap: ${GAP}mm; margin-left: 2.5mm; align-self: center; } .kfill svg { display: block; }
.k b { font-size: 6pt; margin-top: 0.2mm; line-height: 1; }
.k span { font-size: 4.5pt; color: #444; height: 1.8mm; line-height: 1.2; }
.line { display: flex; flex-wrap: wrap; align-items: center; gap: 1.6mm ${GROUP_GAP}mm; margin-bottom: 1.6mm; }
.g { display: inline-flex; align-items: center; gap: ${LABEL_GAP}mm; }
.g b { font-weight: normal; font-size: 7.5pt; color: #444; white-space: nowrap; width: ${LABEL}mm; }
.cal { display: flex; gap: 6mm; padding: 1mm; }
.card { display: flex; outline: 0.15mm dashed #999; outline-offset: 0.8mm; }
.sw { display: flex; flex-direction: column; align-items: center; gap: 0.6mm; font-size: 6.5pt; color: #444; }
.sw div { width: 8mm; height: 8mm; }
.lines { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-flow: column; grid-template-rows: repeat(3, auto); gap: 0.8mm 5mm; margin-bottom: 1.2mm; }
.ln { display: grid; grid-template-columns: 5mm 9mm auto 1fr; align-items: center; gap: 1mm; }
.sp { gap: ${GAP}mm; flex-wrap: nowrap; } .sp b { font-weight: normal; font-size: 7.5pt; color: #444; width: 9mm; }
.covers { display: flex; gap: 5mm; align-items: flex-start; margin-bottom: 1.2mm; }
.cv { display: flex; flex-direction: column; align-items: center; gap: 0.4mm; } .cv svg { display: block; } .cv b { font-size: 6pt; } .cv span { font-size: 5pt; color: #444; }
.ln b { font-size: 6pt; } .ln span { font-size: 5pt; color: #444; } .ln svg { display: block; }
</style></head><body>
${sparesOnly ? `<div class="cal">${card}${card}</div>
${lineSet()}${lineSet(GREEN)}
${spares}` : `<h1>Neck dots · Strat kit (25.5″) · A3</h1>
<p>Print at 100%, matte sticker paper. Dots: fret, and mm from the nut to the middle of the fret space. Lines: wire, mm from the nut to the wire, and length; the dashed frame is that length, cut outside it for a longer line. Strings off; stick each line across the board beside its wire, on the body side, touching the wire.</p>
<h2>Calibration</h2>
<div class="cal">${card}${card}</div>
<h2>Dots <span>rows: top edge (low E side), bottom edge (high E side); big top, big bottom, then big 13–22 top and bottom; nut dots on the headstock, touching the nut; spares at the row ends</span></h2>${dotRows}
<h2>Lines across the board <span>${zones} · how many lines says which · a set, a spare set, a green set</span></h2>${lineSet()}
${lineSet()}${lineSet(GREEN)}
<h2>Bridge <span>level with the saddles, ${SCALE_MM} mm from the nut</span></h2>
<div class="line"><span class="g"><b>${BRIDGE_DOT} mm</b>${strip(BRIDGE_DOT, across(BRIDGE_DOT), byName.Blue.hex)}</span></div>
<h2>Fret covers <span>for testing · each fills one fret space, one colour band per string, the same on each, wire to wire and edge to edge; low E side on the left, nut end at the top</span></h2>
<div class="covers">${COVERS.map((n) => { const c = cover(n); return `<div class="cv">${c.svg}<b>fret ${n}</b><span>${c.w} × ${c.h} mm</span></div>`; }).join("")}</div>
${spares ? `<h2>Spares</h2>${spares}` : ""}
`}</body></html>`;
}
{
  const page = await browser.newPage();
  const render = async (lines) => { await page.setContent(kitPage(lines)); return page.pdf({ format: "A3", printBackground: true, preferCSSPageSize: true }); };
  // spare lines in this order, until one more would start a second page
  // spares in what is left of the page: a line per size, big first, each colour on it
  const order = [[16, 2], [12, 2], [10, 2], [8, 3], [20, 1], [16, 2], [12, 2], [10, 2], [8, 3], [10, 2], [8, 3]];
  const lines = [];
  for (const line of order) {
    lines.push(line);
    if (pagesOf(await render(lines)) > 1) lines.pop(); // too big: try the next, smaller ones
  }
  await page.setContent(kitPage(lines));
  const pdf = await page.pdf({ path: "public/riff/neck-dots-strat-a3.pdf", format: "A3", printBackground: true, preferCSSPageSize: true });
  if (pagesOf(pdf) !== 1) throw new Error("neck-dots-strat-a3.pdf runs past one page");
  console.log(`neck-dots-strat-a3.pdf: ${pagesOf(pdf)} pages, ${lines.length} spare lines, ${(pdf.length / 1024).toFixed(0)} KB`);
  if (process.env.PREVIEW) {
    await page.emulateMedia({ media: "print" });
    await page.setViewportSize({ width: Math.round(297 * 96 / 25.4), height: 800 });
    await page.screenshot({ path: `${process.env.PREVIEW}/neck-dots-strat-a3.pdf.png`, fullPage: true });
  }
  // the spares sheet: two calibration cards, a coloured and a green set of lines, and spare dots filling the page; little text
  // rounds of sizes, big first, until nothing more fits (a line too big is skipped for the smaller ones after it)
  const spareOrder = Array.from({ length: 5 }, () => [[20, 1], [16, 2], [12, 2], [10, 2], [8, 3], [6, 4]]).flat();
  const sp = [];
  for (const l of spareOrder) {
    sp.push(l);
    await page.setContent(kitPage(sp, true));
    if (pagesOf(await page.pdf({ format: "A3", printBackground: true, preferCSSPageSize: true })) > 1) sp.pop();
  }
  await page.setContent(kitPage(sp, true));
  const spPdf = await page.pdf({ path: "public/riff/neck-dots-strat-spares-a3.pdf", format: "A3", printBackground: true, preferCSSPageSize: true });
  console.log(`neck-dots-strat-spares-a3.pdf: ${pagesOf(spPdf)} page, ${sp.length} spare lines, ${(spPdf.length / 1024).toFixed(0)} KB`);
  await page.close();
}
await browser.close();
