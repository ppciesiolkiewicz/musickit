// Draws one SVG per /learn article: node scripts/learn-art.mjs public/images/learn/art. 1200 × 480; keep the motif in y 40–440 so a 3:1 crop works.
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const C = { sky: "#38bdf8", violet: "#a78bfa", teal: "#2dd4bf", amber: "#fbbf24", rose: "#fb7185", slate: "#94a3b8" };
const W = 1200, H = 480;
const r = (n) => Math.round(n * 10) / 10;

function base(glows, body, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111c33"/><stop offset="1" stop-color="#030712"/></linearGradient>
<filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="70"/></filter>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#94a3b8" fill-opacity=".13"/></pattern>
${extraDefs}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
${glows.map(([x, y, rad, c, o = 0.3]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${C[c]}" opacity="${o}" filter="url(#soft)"/>`).join("\n")}
${body}
</svg>
`;
}

const grad = (id, stops, x2 = 1, y2 = 0) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${r(i / (stops.length - 1))}" stop-color="${C[c] ?? c}"/>`).join("")}</linearGradient>`;
const path = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${r(x)} ${r(y)}`).join("");

// 1. Pitch matching: a sung pitch wobbling onto the target note.
function pitch() {
  const lanes = [120, 160, 200, 280, 320, 360].map((y) => `<line x1="80" y1="${y}" x2="1120" y2="${y}" stroke="#334155" stroke-width="1.5" stroke-dasharray="2 10" stroke-linecap="round"/>`).join("");
  const pts = [];
  for (let x = 130; x <= 1030; x += 4) { const t = x - 130; pts.push([x, 240 + 110 * Math.exp(-t / 200) * Math.cos(t / 42) + 3 * Math.sin(t / 9)]); }
  const [ex, ey] = pts.at(-1);
  return base([[240, 110, 190, "violet"], [1000, 380, 210, "teal", 0.26], [620, 240, 160, "sky", 0.14]],
    `${lanes}
<rect x="80" y="222" width="1040" height="36" rx="18" fill="${C.teal}" fill-opacity=".12" stroke="${C.teal}" stroke-opacity=".5" stroke-width="2"/>
<path d="${path(pts)}" fill="none" stroke="url(#trace)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
<circle cx="${r(ex)}" cy="${r(ey)}" r="26" fill="none" stroke="${C.teal}" stroke-opacity=".45" stroke-width="3"/>
<circle cx="${r(ex)}" cy="${r(ey)}" r="13" fill="${C.teal}" filter="url(#glow)"/>`,
    grad("trace", ["rose", "amber", "teal", "teal"]));
}

// 2. Vocal warm-ups: breath waves and a siren swooping up and back down.
function warmUps() {
  const wave = (amp, len, phase, y0, c, o, w) => {
    const pts = [];
    for (let x = 40; x <= 1160; x += 6) { const env = Math.sin(((x - 40) / 1120) * Math.PI); pts.push([x, y0 + amp * env * Math.sin(x / len + phase)]); }
    return `<path d="${path(pts)}" fill="none" stroke="${C[c]}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const siren = [];
  for (let x = 150; x <= 1050; x += 5) { const t = (x - 150) / 900; siren.push([x, 380 - 270 * Math.sin(t * Math.PI) ** 1.6 + 6 * Math.sin(x / 7)]); }
  return base([[300, 380, 220, "violet", 0.28], [900, 100, 200, "rose", 0.22], [620, 260, 180, "sky", 0.14]],
    `${wave(70, 38, 0, 300, "violet", 0.35, 3)}${wave(50, 30, 1.3, 310, "sky", 0.35, 3)}${wave(36, 24, 2.4, 320, "teal", 0.4, 3)}
<path d="${path(siren)}" fill="none" stroke="url(#siren)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
<circle cx="150" cy="380" r="12" fill="${C.amber}" filter="url(#glow)"/>
<circle cx="1050" cy="380" r="12" fill="${C.violet}" filter="url(#glow)"/>`,
    grad("siren", ["amber", "rose", "violet"]));
}

// 3. Scale-degree feelings: the notes of a scale rising over a glowing drone, each its own colour.
function feelings() {
  const cols = ["sky", "teal", "violet", "amber", "rose", "teal", "violet", "sky"];
  const notes = cols.map((c, i) => [180 + i * 120, 360 - i * 34, c]);
  const halos = [0, 22, 30, 16, 26, 34, 40, 0];
  return base([[200, 400, 200, "sky", 0.3], [1000, 120, 220, "violet", 0.26]],
    `<rect x="60" y="410" width="1080" height="20" rx="10" fill="${C.sky}" fill-opacity=".15"/><rect x="60" y="417" width="1080" height="6" rx="3" fill="${C.sky}" filter="url(#glow)"/>
${notes.map(([x, y]) => `<line x1="${x}" y1="${y + 30}" x2="${x}" y2="414" stroke="#475569" stroke-width="2" stroke-dasharray="3 8" stroke-linecap="round"/>`).join("")}
${notes.map(([x, y, c], i) => `<circle cx="${x}" cy="${y}" r="${36 + halos[i]}" fill="${C[c]}" fill-opacity=".1"/><circle cx="${x}" cy="${y}" r="30" fill="${C[c]}" fill-opacity=".22" stroke="${C[c]}" stroke-width="3" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="9" fill="${C[c]}"/>`).join("\n")}`);
}

// 4. Intervals and solfège: two octaves of a piano, Do, Mi and Sol lit, arcs from Do.
function names() {
  const kw = 56, n = 15, x0 = (W - kw * n) / 2, y0 = 250, kh = 180;
  const white = Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * kw + 2}" y="${y0}" width="${kw - 4}" height="${kh}" rx="7" fill="url(#key)"/>`).join("");
  const blackAt = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  const black = blackAt.map((i) => `<rect x="${x0 + (i + 1) * kw - 17}" y="${y0}" width="34" height="${kh * 0.6}" rx="5" fill="#0b1222" stroke="#1e293b"/>`).join("");
  const kx = (i) => x0 + i * kw + kw / 2;
  const lit = [[0, "sky"], [2, "violet"], [4, "teal"], [7, "sky"], [9, "violet"], [11, "teal"], [14, "sky"]];
  const dots = lit.map(([i, c]) => `<circle cx="${kx(i)}" cy="${y0 + kh - 30}" r="13" fill="${C[c]}" filter="url(#glow)"/>`).join("");
  const arc = (a, b, h, c) => `<path d="M${kx(a)} ${y0 - 16}Q${(kx(a) + kx(b)) / 2} ${y0 - 16 - h} ${kx(b)} ${y0 - 16}" fill="none" stroke="${C[c]}" stroke-width="5" stroke-linecap="round" filter="url(#glow)"/>`;
  return base([[220, 140, 200, "violet", 0.26], [980, 160, 200, "sky", 0.26], [600, 440, 200, "teal", 0.16]],
    `${arc(0, 2, 90, "violet")}${arc(0, 4, 170, "teal")}${arc(0, 7, 240, "sky")}${arc(7, 9, 90, "violet")}${arc(7, 11, 170, "teal")}${arc(7, 14, 240, "sky")}
${white}${black}${dots}`,
    `<linearGradient id="key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbd5e1" stop-opacity=".9"/><stop offset="1" stop-color="#94a3b8" stop-opacity=".75"/></linearGradient>`);
}

// Guitar neck: high e on top. Frets 1..12 between x0 and x0+w; dots sit mid-fret.
const OPEN = [4, 11, 7, 2, 9, 4]; // e B G D A E pitch classes, top to bottom
function neck({ x0, y0, w, gap, frets = 12 }) {
  const fw = w / frets, h = gap * 5;
  const strings = OPEN.map((_, s) => `<line x1="${x0}" y1="${y0 + s * gap}" x2="${x0 + w}" y2="${y0 + s * gap}" stroke="#64748b" stroke-width="${1.2 + s * 0.35}"/>`).join("");
  const fretLines = Array.from({ length: frets + 1 }, (_, f) => `<line x1="${x0 + f * fw}" y1="${y0}" x2="${x0 + f * fw}" y2="${y0 + h}" stroke="#334155" stroke-width="${f ? 2.5 : 7}"/>`).join("");
  const inlays = [3, 5, 7, 9].map((f) => `<circle cx="${x0 + (f - 0.5) * fw}" cy="${y0 + h / 2}" r="7" fill="#1e293b"/>`).join("") +
    `<circle cx="${x0 + 11.5 * fw}" cy="${y0 + h / 2 - gap}" r="7" fill="#1e293b"/><circle cx="${x0 + 11.5 * fw}" cy="${y0 + h / 2 + gap}" r="7" fill="#1e293b"/>`;
  const at = (s, f) => [x0 + (f - 0.5) * fw, y0 + s * gap];
  const board = `<rect x="${x0}" y="${y0 - gap * 0.6}" width="${w}" height="${h + gap * 1.2}" rx="10" fill="#0b1222" fill-opacity=".85"/>${inlays}${fretLines}${strings}`;
  return { board, at, fw };
}
const scaleDots = (n, pcs, root, col, faded = () => false, rad = 8) => {
  let out = "";
  for (let s = 0; s < 6; s++) for (let f = 1; f <= 12; f++) {
    const pc = (OPEN[s] + f) % 12;
    if (!pcs.includes(pc)) continue;
    const [x, y] = n.at(s, f);
    const fade = faded(s, f, pc);
    out += `<circle cx="${r(x)}" cy="${r(y)}" r="${rad}" fill="${col}" fill-opacity="${fade ? 0.25 : 0.95}"/>`;
    if (pc === root) out += `<circle cx="${r(x)}" cy="${r(y)}" r="${rad + 4}" fill="none" stroke="${C.rose}" stroke-width="2.5" stroke-opacity="${fade ? 0.4 : 1}"/>`;
  }
  return out;
};
const frame = (n, s1, s2, f1, f2, c, pad = 22) => {
  const [xa, ya] = n.at(s1, f1), [xb, yb] = n.at(s2, f2);
  return `<rect x="${r(xa - 26)}" y="${r(ya - pad)}" width="${r(xb - xa + 52)}" height="${r(yb - ya + 2 * pad)}" rx="16" fill="${C[c]}" fill-opacity=".1" stroke="${C[c]}" stroke-width="3" filter="url(#glow)"/>`;
};

// 5. Major and minor scales: A minor over A major, the same island framed in both.
function scales() {
  const top = neck({ x0: 120, y0: 70, w: 960, gap: 24 }), bot = neck({ x0: 120, y0: 290, w: 960, gap: 24 });
  const outside = (s, f) => !(f >= 4 && f <= 8 && s >= 3);
  return base([[200, 120, 200, "violet", 0.26], [1000, 380, 200, "amber", 0.24]],
    `${top.board}${frame(top, 3, 5, 4, 8, "violet")}${scaleDots(top, [9, 11, 0, 2, 4, 5, 7], 9, C.violet, outside)}
${bot.board}${frame(bot, 3, 5, 4, 8, "amber")}${scaleDots(bot, [9, 11, 1, 2, 4, 6, 8], 9, C.amber, outside)}`);
}

// 6. Scale degrees in any key: Do Re on the D string in A minor, the same frets on the A string in E minor.
function anyKey() {
  const n = neck({ x0: 110, y0: 140, w: 980, gap: 40 });
  const faded = () => true;
  const isl = (s, c) => { const [xa, ya] = n.at(s, 7), [xb] = n.at(s, 9); return `${frame(n, s, s, 7, 9, c, 17)}<circle cx="${r(xa)}" cy="${ya}" r="15" fill="${C[c]}" filter="url(#glow)"/><circle cx="${r(xa)}" cy="${ya}" r="21" fill="none" stroke="${C.rose}" stroke-width="3.5"/><circle cx="${r(xb)}" cy="${ya}" r="15" fill="${C[c]}" filter="url(#glow)"/>`; };
  return base([[260, 120, 200, "sky", 0.26], [960, 380, 200, "amber", 0.24]],
    `${n.board}${scaleDots(n, [9, 11, 0, 2, 4, 5, 7], 9, C.slate, faded, 11)}${isl(3, "sky")}${isl(4, "amber")}`);
}

// 7. Barre chord alternatives: a dim F barre, then a bright Fmaj7.
function chordBox(x0, y0, { barre, dots, open = [], mute = [] }, bright) {
  const gw = 40, fh = 50, op = bright ? 1 : 0.35;
  let s = `<g opacity="${op}"><rect x="${x0 - 20}" y="${y0 - 20}" width="${gw * 5 + 40}" height="${fh * 5 + 40}" rx="18" fill="#0b1222" fill-opacity=".8"/>`;
  s += `<rect x="${x0}" y="${y0 - 5}" width="${gw * 5}" height="8" rx="3" fill="#cbd5e1"/>`;
  for (let i = 0; i <= 5; i++) s += `<line x1="${x0 + i * gw}" y1="${y0}" x2="${x0 + i * gw}" y2="${y0 + fh * 5}" stroke="#64748b" stroke-width="2.5"/>`;
  for (let f = 1; f <= 5; f++) s += `<line x1="${x0}" y1="${y0 + f * fh}" x2="${x0 + gw * 5}" y2="${y0 + f * fh}" stroke="#334155" stroke-width="2.5"/>`;
  const fill = bright ? "url(#chord)" : "#94a3b8";
  if (barre) s += `<rect x="${x0 - 14}" y="${y0 + (barre - 0.5) * fh - 14}" width="${gw * 5 + 28}" height="28" rx="14" fill="${fill}"/>`;
  for (const [str, f] of dots) s += `<circle cx="${x0 + str * gw}" cy="${y0 + (f - 0.5) * fh}" r="15" fill="${fill}" ${bright ? 'filter="url(#glow)"' : ""}/>`;
  for (const str of open) s += `<circle cx="${x0 + str * gw}" cy="${y0 - 30}" r="9" fill="none" stroke="${C.teal}" stroke-width="3"/>`;
  for (const str of mute) s += `<path d="M${x0 + str * gw - 8} ${y0 - 38}l16 16m0-16l-16 16" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>`;
  return s + "</g>";
}
function barre() {
  // strings left to right: low E (0) … high e (5)
  const F = { barre: 1, dots: [[1, 3], [2, 3], [3, 2]] };
  const Fmaj7 = { dots: [[2, 3], [3, 2], [4, 1]], open: [5], mute: [0, 1] };
  return base([[260, 260, 200, "slate", 0.14], [880, 200, 220, "amber", 0.26], [1080, 420, 180, "rose", 0.2]],
    `${chordBox(250, 125, F, false)}
<path d="M540 250h120m-26-26 26 26-26 26" fill="none" stroke="#e2e8f0" stroke-opacity=".7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
${chordBox(760, 125, Fmaj7, true)}`,
    grad("chord", ["amber", "rose"], 1, 1));
}

// 8. Microphone and audio interface: a mic, its cable and a two-knob box, sound coming in.
function mic() {
  const mesh = [];
  for (let i = -80; i <= 80; i += 14) mesh.push(`M${280 + i} 70V250M100 ${160 + i}H460`);
  const knob = (x, c) => `<circle cx="${x}" cy="300" r="40" fill="none" stroke="${C[c]}" stroke-width="5" filter="url(#glow)"/><circle cx="${x}" cy="300" r="28" fill="#1e293b" stroke="#475569" stroke-width="2"/><line x1="${x}" y1="300" x2="${x - 14}" y2="280" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>`;
  return base([[280, 160, 200, "sky", 0.28], [900, 320, 220, "teal", 0.24]],
    `${[110, 150, 190].map((rad, i) => `<path d="M${280 - rad * 0.71} ${160 - rad * 0.71}A${rad} ${rad} 0 0 1 ${280 + rad * 0.71} ${160 - rad * 0.71}" fill="none" stroke="${C.violet}" stroke-opacity="${0.6 - i * 0.15}" stroke-width="4" stroke-linecap="round" transform="rotate(-90 280 160)"/>`).join("")}
<path d="M388 350Q430 362 480 344H640" fill="none" stroke="#475569" stroke-width="8" stroke-linecap="round"/>
<g transform="rotate(-30 280 160)">
<path d="M246 236L262 380H298L314 236Z" fill="url(#body)"/>
<rect x="242" y="226" width="76" height="16" rx="5" fill="#475569"/>
</g>
<circle cx="280" cy="160" r="78" fill="#1e293b"/>
<g clip-path="url(#ball)"><path d="${mesh.join("")}" stroke="#94a3b8" stroke-opacity=".55" stroke-width="2"/></g>
<circle cx="280" cy="160" r="78" fill="url(#shine)"/>
<circle cx="280" cy="160" r="78" fill="none" stroke="#cbd5e1" stroke-opacity=".8" stroke-width="4"/>
<rect x="640" y="220" width="420" height="160" rx="24" fill="url(#box)" stroke="#475569" stroke-width="2"/>
${knob(730, "teal")}${knob(850, "sky")}
<circle cx="960" cy="285" r="13" fill="#020617" stroke="#64748b" stroke-width="3"/><circle cx="1010" cy="285" r="13" fill="#020617" stroke="#64748b" stroke-width="3"/>
<circle cx="960" cy="330" r="5" fill="${C.teal}" filter="url(#glow)"/><circle cx="985" cy="330" r="5" fill="${C.teal}" filter="url(#glow)"/><circle cx="1010" cy="330" r="5" fill="#334155"/>`,
    `<clipPath id="ball"><circle cx="280" cy="160" r="76"/></clipPath>
<radialGradient id="shine" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e2e8f0" stop-opacity=".35"/><stop offset=".6" stop-color="#e2e8f0" stop-opacity="0"/></radialGradient>
<linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#334155"/><stop offset=".5" stop-color="#64748b"/><stop offset="1" stop-color="#1e293b"/></linearGradient>
<linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient>`);
}

const ART = {
  "pitch-matching-exercises": pitch,
  "vocal-warm-ups": warmUps,
  "scale-degree-feelings": feelings,
  "intervals-and-solfege": names,
  "major-and-minor-scales-guitar": scales,
  "scale-degrees-guitar-any-key": anyKey,
  "barre-chord-alternatives": barre,
  "microphone-and-audio-interface-for-singing": mic,
};
for (const [slug, draw] of Object.entries(ART)) writeFileSync(`${OUT}/${slug}.svg`, draw());
console.log(Object.keys(ART).length, "written");
