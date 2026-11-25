import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STRIP_HALF, TOP_WIRE, axisOf, boardMarkers, keepMarkers, lineFit, peakNear, proj, projFit, projInv, ransacLine, readStrip, stripOf, wireMm,
  type BoardMarker, type Seen,
} from "./cvFrets";
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
