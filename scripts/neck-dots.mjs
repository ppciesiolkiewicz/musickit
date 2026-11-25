// Prints public/riff/neck-dots-a4.pdf and neck-dots-a3.pdf: round colour dots to stick along the fretboard's edges,
// for a colour-threshold reader to find (cheap, and a blurred or half-covered dot still has a centre).
// Each colour has a job; all are far in hue from skin, maple and rosewood (no red, orange, pink or yellow).
// Each dot has a thin white rim so it stands out on a dark board. One page per sheet: rows are added, largest
// dots last, until the page is full.
//   node scripts/neck-dots.mjs
import { chromium } from "playwright";

const COLOURS = [
  { name: "Green", hex: "#00a651", job: "Near edge: the board's edge on the markers' side, one dot at each fret (or each dot fret)." },
  { name: "Cyan", hex: "#00aeef", job: "Far edge: the other edge, at the same frets as the green dots." },
  { name: "Magenta", hex: "#d6007f", job: "Landmarks: the nut and fret 12, on both edges, so the reader can place the neck without markers." },
  { name: "Blue", hex: "#1f4fd8", job: "Spare: to try against the others in your room's light. Reads poorly on a dark rosewood board." },
];
const RIM = 0.7; // mm of white round each dot
const GAP = 2.5; // mm between pieces
const LABEL_W = 16; // mm, the size written at the start of each row
const HEAD = 9, CAL = 30; // mm

const SHEETS = [
  { file: "neck-dots-a4.pdf", format: "A4", w: 210, h: 297, margin: 10, header: 42, sizes: [3, 4, 5, 6], extra: [8, 5, 6, 4] },
  { file: "neck-dots-a3.pdf", format: "A3", w: 297, h: 420, margin: 10, header: 34, sizes: [3, 4, 5, 6, 8, 10], extra: [12, 5, 6, 4, 3] },
];

const piece = (d) => d + 2 * RIM;
const rowH = (d) => Math.max(piece(d), 4) + GAP;

function dot(d, hex) {
  return `<div class="cut" style="width:${piece(d)}mm;height:${piece(d)}mm"><div style="width:${d}mm;height:${d}mm;background:${hex}"></div></div>`;
}

function build(sheet) {
  const usable = sheet.w - 2 * sheet.margin;
  const room = sheet.h - 2 * sheet.margin - sheet.header - CAL;
  // rows per colour: one of each size, then the common sizes again (round robin) while the page has room
  const rows = COLOURS.map(() => [...sheet.sizes]);
  const used = () => rows.reduce((t, r) => t + HEAD + r.reduce((s, d) => s + rowH(d), 0), 0);
  if (used() > room) throw new Error(`${sheet.format}: the sizes don't fit (${used().toFixed(0)} of ${room} mm)`);
  for (let grew = true; grew;) {
    grew = false;
    for (const d of sheet.extra) for (const r of rows) {
      if (r.filter((x) => x === d).length < 3 && used() + rowH(d) <= room) { r.push(d); grew = true; }
    }
  }
  for (const r of rows) r.sort((a, b) => a - b);

  const sections = COLOURS.map((c, i) => {
    const lines = rows[i].map((d) => {
      const each = Math.floor((usable - LABEL_W + GAP) / (piece(d) + GAP));
      return `<div class="row" style="height:${rowH(d)}mm"><span class="size">${d} mm</span>${Array(each).fill(dot(d, c.hex)).join("")}</div>`;
    });
    return `<h2><i style="background:${c.hex}"></i>${c.name} <span>${c.hex} · ${c.job}</span></h2>${lines.join("")}`;
  });

  const swatch = (hex, label) => `<div class="sw"><div style="background:${hex}"></div><span>${label}</span></div>`;
  const cal = `<h2>Colour check <span>Stick one beside the neck, in the camera's view, to set the colours from (white balance and each dot's colour as the camera sees it).</span></h2>
<div class="cal">${swatch("#ffffff", "White")}${swatch("#808080", "Grey")}${swatch("#000000", "Black")}${COLOURS.map((c) => swatch(c.hex, c.name)).join("")}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Neck dots ${sheet.format}</title><style>
@page { size: ${sheet.format}; margin: ${sheet.margin}mm; }
* { box-sizing: border-box; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 9pt -apple-system, Helvetica, Arial, sans-serif; color: #000; }
h1 { font-size: 13pt; margin-bottom: 2mm; }
p { margin-bottom: 1mm; }
.head { height: ${sheet.header}mm; }
h2 { font-size: 10pt; height: ${HEAD}mm; padding-top: 2.5mm; display: flex; align-items: baseline; gap: 2mm; white-space: nowrap; overflow: hidden; }
h2 i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; align-self: center; }
h2 span { font-weight: normal; color: #444; font-size: 8pt; overflow: hidden; text-overflow: ellipsis; }
.row { display: flex; align-items: center; gap: ${GAP}mm; }
.size { width: ${LABEL_W - GAP}mm; font-size: 7.5pt; color: #444; flex: none; }
.cut { flex: none; border-radius: 50%; background: #fff; outline: 0.15mm dashed #999; outline-offset: 0; display: flex; align-items: center; justify-content: center; }
.cut > div { border-radius: 50%; }
.cal { display: flex; gap: 4mm; height: ${CAL - HEAD}mm; align-items: flex-start; }
.sw { display: flex; flex-direction: column; align-items: center; gap: 1mm; font-size: 7pt; color: #444; }
.sw div { width: 15mm; height: 15mm; outline: 0.15mm dashed #999; }
</style></head><body>
<div class="head">
<h1>Neck dots · ${sheet.format}</h1>
<p>Print at 100% ("Actual size") on matte sticker paper, with colour on. Glossy paper flashes white under a lamp. Measure one dot: the size at the start of its row is the coloured part, without the white rim.</p>
<p>Cut on the dashed circle, keeping the white rim: it makes the dot stand out on a dark board. A hole punch (6 mm) cuts the 5 mm dots cleanly.</p>
<p>Where: on the top of the board right at its edge, outside the outer strings (3 or 4 mm fits there), or on the side of the neck facing the camera (5 or 6 mm). Put them where the fretting fingers and the strings don't cover them. Bigger dots are for testing how far away the camera still sees them.</p>
<p>The reader doesn't read these yet: they are to try out.</p>
</div>
${cal}
${sections.join("\n")}
</body></html>`;
}

const browser = await chromium.launch();
for (const sheet of SHEETS) {
  const page = await browser.newPage();
  await page.setContent(build(sheet));
  await page.pdf({ path: `public/riff/${sheet.file}`, format: sheet.format, printBackground: true, preferCSSPageSize: true });
  const pages = await page.evaluate((h) => Math.ceil(document.body.scrollHeight / ((h - 20) * 96 / 25.4)), sheet.h);
  console.log(`${sheet.file}: ~${pages} page(s)`);
  await page.close();
}
await browser.close();
