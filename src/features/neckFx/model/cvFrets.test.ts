import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STRIP_HALF, TOP_WIRE, axisOf, boardMarkers, guessPlace, keepMarkers, lineFit, midiAt, peakNear, placeOnNeck, proj, projFit, projInv, ransacLine,
  readStrip, spotOf, stringsOf, stripOf, wireMm, type BoardMarker, type Neck, type Seen,
} from "./cvFrets";
import { DEFAULT_CV, flicker, heatAt, numbered, readCv } from "./cvFx";
import { parsePlaced, type Pt } from "./grid";

const close = (a: number, b: number, tol: number, what = "") => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} ≠ ${b} (±${tol})`);
const square = (id: number, c: Pt, side: number): Seen =>
  ({ id, corners: [{ x: c.x - side / 2, y: c.y - side / 2 }, { x: c.x + side / 2, y: c.y - side / 2 }, { x: c.x + side / 2, y: c.y + side / 2 }, { x: c.x - side / 2, y: c.y + side / 2 }] });

const BOARD: BoardMarker[] = [{ id: 62, fret: 1, mm: 24 }, { id: 97, fret: 7, mm: 18 }, { id: 107, fret: 9, mm: 16 }];
const PX = 2; // px per mm, a level neck seen straight on, nut at x 100, the markers' line at y 300
const midMm = (f: number) => (wireMm(f - 1) + wireMm(f)) / 2;
const seenLevel = (): Seen[] => BOARD.map((b) => square(b.id, { x: 100 + PX * midMm(b.fret), y: 300 }, b.mm * PX));

test("board markers leave out the nut and markers off the board", () => {
  const placed = parsePlaced("56@0/30+8, 62@1, 51@19, 9@3");
  assert.deepEqual(boardMarkers(placed, (id) => (id === 9 ? undefined : 20), new Set([51])), [{ id: 62, fret: 1, mm: 20 }]);
});

test("keeps markers big enough and near square, the bigger of one id twice", () => {
  const kept = keepMarkers([square(1, { x: 0, y: 0 }, 30), square(1, { x: 50, y: 0 }, 40), square(2, { x: 0, y: 0 }, 6),
    { id: 3, corners: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 15 }, { x: 0, y: 15 }] }], 10);
  assert.deepEqual(kept.map((m) => [m.id, m.corners[0].x]), [[1, 30]]);
});

test("the perspective fit gives back what made the points", () => {
  const p: [number, number, number] = [2.2, -350, -0.0003];
  const xs = [10, 80, 200, 260, 400], ss = xs.map((x) => proj(p, x));
  const q = projFit(xs, ss)!;
  for (const x of [0, 150, 465]) close(proj(q, x), proj(p, x), 1e-6);
  close(projInv(q, proj(q, 123)), 123, 1e-6);
  assert.deepEqual(projFit([1, 2], [3, 5]), [2, 1, 0]);
  assert.equal(projFit([1], [1]), null);
});

test("a line through most points, past the outliers", () => {
  const x = Array.from({ length: 40 }, (_, i) => i * 8), y = x.map((v, i) => (i % 3 === 0 ? 500 - i * 7 : 0.1 * v + 40));
  const l = ransacLine(x, y, 2)!;
  close(l[0], 0.1, 1e-9); close(l[1], 40, 1e-9);
  assert.equal(ransacLine([1, 2, 3], [1, 2, 3], 1), null);
  assert.deepEqual(lineFit([0, 1], [1, 3]), [2, 1]);
});

test("a peak only when it stands out", () => {
  const prof = new Float32Array(50); prof[20] = 30; prof[21] = 10;
  assert.equal(peakNear(prof, 22, 5), 20);
  assert.equal(peakNear(prof, 40, 5), null);
});

test("the axis runs along the markers toward the body, and drops one off the board", () => {
  const ax = axisOf(seenLevel(), BOARD)!;
  close(ax.d.x, 1, 1e-9); close(ax.d.y, 0, 1e-9);
  for (const m of ax.marks) close(proj(ax.pm, m.x), m.s, 1e-6);
  close(ax.ratio, 1, 1e-6);
  // a big marker level with fret 19, well off the line (on the body): left out
  const withBody = [...seenLevel(), square(51, { x: 100 + PX * midMm(19), y: 180 }, 80)];
  const ax2 = axisOf(withBody, [...BOARD, { id: 51, fret: 19, mm: 40 }])!;
  assert.deepEqual(ax2.marks.map((m) => m.id), [62, 97, 107]);
  assert.equal(axisOf(seenLevel().slice(0, 1), BOARD), null);
});

test("frets from a drawn strip: wires on their columns, ends on the board's edges", () => {
  const ax = axisOf(seenLevel(), BOARD)!, st = stripOf(ax)!;
  const W = st.len, H = 2 * STRIP_HALF;
  // the board: its edge 30 px beyond the markers' line (row 140), 2 px a mm wide, widening 42 mm to 56 mm along the neck
  const colOfMm = (mm: number) => proj(ax.pm, mm) - st.start;
  const topRow = STRIP_HALF - 30;
  const botRow = (c: number) => topRow + PX * (42 + (14 * Math.max(0, projInv(ax.pm, c + st.start))) / wireMm(TOP_WIRE));
  const gray = new Uint8Array(W * H);
  for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) gray[r * W + c] = r >= topRow && r <= botRow(c) ? 150 : 40;
  const wires = Array.from({ length: TOP_WIRE }, (_, i) => Math.round(colOfMm(wireMm(i + 1))));
  for (const c of wires) for (let r = 0; r < H; r++) if (r >= topRow && r <= botRow(c)) gray[r * W + c] = 255;
  const gy = new Float32Array(W * H);
  for (let r = 2; r < H - 2; r++) for (let c = 0; c < W; c++) gy[r * W + c] = gray[(r + 2) * W + c] - gray[(r - 2) * W + c];
  const read = readStrip(ax, st, gray, gy, {})!;
  assert.equal(read.length, TOP_WIRE + 1);
  for (let f = 1; f <= TOP_WIRE; f++) {
    close(read[f].top.x, wires[f - 1], 1.5, `wire ${f}`);
    close(read[f].top.y, topRow, 3, `top ${f}`);
    close(read[f].bottom.y, botRow(read[f].bottom.x), 3, `bottom ${f}`);
  }
});

test("strings found in a drawn strip sit where they are drawn, and a hand across them doesn't move them", () => {
  const ax = axisOf(seenLevel(), BOARD)!, st = stripOf(ax)!;
  const W = st.len, H = 2 * STRIP_HALF, topRow = 100, botRow = 220;
  const gray = new Uint8Array(W * H).fill(40);
  for (let c = 0; c < W; c++) for (let r = topRow; r <= botRow; r++) gray[r * W + c] = 150;
  const fracs = [0.09, 0.25, 0.42, 0.58, 0.75, 0.91];
  for (const f of fracs) for (let c = 0; c < W; c++) gray[Math.round(topRow + f * (botRow - topRow)) * W + c] = 230;
  // a hand: a bright block over a third of the strings
  for (let c = 300; c < 420; c++) for (let r = topRow; r <= botRow; r++) gray[r * W + c] = 200;
  const carry = { top: [0, topRow] as [number, number], bottom: [0, botRow] as [number, number] };
  const wires = [{ top: { x: 70, y: topRow }, bottom: { x: 70, y: botRow } }, { top: { x: W - 70, y: topRow }, bottom: { x: W - 70, y: botRow } }];
  const lines = stringsOf(st, gray, wires, carry);
  assert.equal(lines.length, 6);
  lines.forEach(([m, q], i) => { close(m, 0, 0.01, `slope ${i}`); close(q, topRow + fracs[i] * (botRow - topRow), 1.5, `string ${i}`); });
});

// a level neck in the frame: wires straight up at x 100 + 20·f, strings across at y 100 + 10·s (low E on top)
const flat: Neck = {
  wires: Array.from({ length: TOP_WIRE + 1 }, (_, f) => ({ top: { x: 100 + 20 * f, y: 90 }, bottom: { x: 100 + 20 * f, y: 160 } })),
  strings: Array.from({ length: 6 }, (_, s) => ({ a: { x: 100, y: 100 + 10 * s }, b: { x: 100 + 20 * TOP_WIRE, y: 100 + 10 * s } })),
};

test("a point on the neck: its fret space and string; off the board, nothing", () => {
  assert.deepEqual(placeOnNeck(flat, { x: 155, y: 121 }), { fret: 3, string: 2 });
  assert.deepEqual(placeOnNeck(flat, { x: 105, y: 96 }), { fret: 1, string: 0 });
  assert.equal(placeOnNeck(flat, { x: 155, y: 40 }), null);
  assert.equal(placeOnNeck(flat, { x: 60, y: 120 }), null);
  const spot = spotOf(flat, 2, 3);
  close(spot.x, 152, 1e-9); close(spot.y, 120, 1e-9);
  assert.equal(midiAt(1, 5), 50);
});

test("a heard note goes where a finger plays it, else nearest the fingers, else open", () => {
  // A on the D string at fret 7 under a finger
  assert.deepEqual(guessPlace(57, [{ string: 2, fret: 7 }, { string: 3, fret: 9 }]), { string: 2, fret: 7 });
  // no finger on it: the place nearest the fingers (A at fret 5 on the low E, fingers at 5)
  assert.deepEqual(guessPlace(45, [{ string: 3, fret: 5 }]), { string: 0, fret: 5 });
  // fingers far up the neck, nowhere near a fretted A: the open A string
  assert.deepEqual(guessPlace(45, [{ string: 3, fret: 12 }]), { string: 1, fret: 0 });
  // no fingers: open when it can be
  assert.deepEqual(guessPlace(45, []), { string: 1, fret: 0 });
  assert.equal(guessPlace(30, []), null);
});

test("Neck fire is hottest by the hand and leaps on a note", () => {
  assert.ok(heatAt(7, 7, 0, 0) > heatAt(15, 7, 0, 0));
  assert.ok(heatAt(7, 7, 0, 1) > heatAt(7, 7, 0, 0));
  assert.ok(heatAt(3, null, 1, 0) > heatAt(3, null, 0, 0));
  for (let x = 0; x < 20; x += 0.7) assert.ok(Math.abs(flicker(x, x * 1.3)) <= 1);
});

test("OpenCV settings read back, with the default for what's unreadable", () => {
  assert.deepEqual(readCv(null), DEFAULT_CV);
  assert.deepEqual(readCv({ numbers: "all", strings: false, fire: "yes", fireStrength: 9 }), { ...DEFAULT_CV, numbers: "all", strings: false, fireStrength: 2 });
  assert.deepEqual(numbered("dots"), [3, 5, 7, 9, 12, 15, 17, 19, 21]);
  assert.equal(numbered("all").length, 22);
  assert.deepEqual(numbered("off"), []);
});
