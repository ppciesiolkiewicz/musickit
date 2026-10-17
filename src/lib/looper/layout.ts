/**
 * The looping stage: groups are coloured rectangles on a canvas, loops are circles. A loop belongs to the group whose rectangle
 * holds the loop's centre. Pure geometry, unit tested. Coordinates are in stage units (STAGE_W by STAGE_H).
 */

/**
 * Loops and sequencers are cards (`LoopStage`): a circle with its controls hanging below it. A card is CARD_W wide; its top is CARD_TOP
 * above the circle's centre (where x and y point) and it runs LOOP_CARD_H (a loop) or SEQ_CARD_H (a sequencer) down from there.
 * The sizes are drawn at 100% whatever the size of the stage's widget or of a group, so placing works in stage units.
 */
export const LOOP_R = 46;
export const CARD_W = 132;
export const CARD_TOP = LOOP_R + 3;
export const LOOP_CARD_H = 216;
export const SEQ_CARD_H = 180;
/** A group's title bar, the padding inside a group, the space between cards and between groups. */
export const GROUP_HEAD = 44;
export const GROUP_PAD = 24;
export const CARD_GAP = 32;
export const GROUP_GAP = 40;
/** Cards side by side in a default group. */
export const GROUP_COLS = 2;

/** A default group: two columns of cards, a row of loops, a row for a drone and a row of sequencers under them. */
export const GROUP_W = GROUP_PAD * 2 + GROUP_COLS * CARD_W + (GROUP_COLS - 1) * CARD_GAP;
export const GROUP_H = GROUP_HEAD + GROUP_PAD * 2 + 2 * (LOOP_CARD_H + CARD_GAP) + SEQ_CARD_H;

export const DEFAULT_GROUPS = 5;
/** height left free below the default groups: loops and sequencers placed there play straight to the master */
export const FREE_STRIP = LOOP_CARD_H + GROUP_GAP * 2;

/** The part that is in view at 100% and where the default groups sit; the rest of the stage is room to grow into. */
export const VIEW_W = GROUP_GAP + DEFAULT_GROUPS * (GROUP_W + GROUP_GAP);
export const VIEW_H = GROUP_GAP + GROUP_H + FREE_STRIP;
/** The whole stage: groups and loops can be anywhere on it. */
export const STAGE_W = 2400;
export const STAGE_H = 2200;
export const MIN_GROUP_W = 140;
export const MIN_GROUP_H = 150;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GroupLayout extends Rect {
  id: string;
}

export const GROUP_COLOURS = ["#38bdf8", "#fbbf24", "#fb7185", "#a78bfa", "#34d399", "#f472b6"];

/** The group a point sits in. Where groups overlap, the one later in the list (drawn on top) wins. */
export function containingGroup(groups: GroupLayout[], x: number, y: number): string | null {
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return g.id;
  }
  return null;
}

/** Keep a group on the stage and at least the minimum size. */
export function clampRect(r: Rect): Rect {
  const w = Math.min(STAGE_W, Math.max(MIN_GROUP_W, r.w));
  const h = Math.min(STAGE_H, Math.max(MIN_GROUP_H, r.h));
  return { w, h, x: Math.min(STAGE_W - w, Math.max(0, r.x)), y: Math.min(STAGE_H - h, Math.max(0, r.y)) };
}

/** Keep a loop's or a sequencer's whole card on the stage. */
export function clampPoint(x: number, y: number): { x: number; y: number } {
  return { x: Math.min(STAGE_W - CARD_W / 2, Math.max(CARD_W / 2, x)), y: Math.min(STAGE_H - LOOP_CARD_H + CARD_TOP, Math.max(CARD_TOP, y)) };
}

/** Loops each default group starts with: one row of two, the sequencers below them. */
export const LOOPS_PER_GROUP = 2;

/** Five side-by-side groups (five buses) across the part in view, with the free strip below them. */
export function defaultGroups(): GroupLayout[] {
  return Array.from({ length: DEFAULT_GROUPS }, (_, i) => ({ id: `g${i + 1}`, x: GROUP_GAP + i * (GROUP_W + GROUP_GAP), y: GROUP_GAP, w: GROUP_W, h: GROUP_H }));
}

/** Columns of cards that fit across a group. */
const colsIn = (g: Rect) => Math.max(1, Math.floor((g.w - GROUP_PAD * 2 + CARD_GAP) / (CARD_W + CARD_GAP)));
/** The centre x of column `col` of `cols`, the columns spread evenly across the group. */
const colX = (g: Rect, col: number, cols: number) => g.x + ((col + 0.5) * g.w) / cols;
/** Where the circle of the first row of cards sits, under the group's title bar. */
const firstRow = (g: Rect) => g.y + GROUP_HEAD + GROUP_PAD + CARD_TOP;

/**
 * A spot for loop number `index`: inside the group `index % groups`, on the group's card grid. The first
 * `groups * LOOPS_PER_GROUP` loops fill the groups one after the other instead (loops 1 and 2 in the first group).
 */
export function defaultSpot(groups: GroupLayout[], index: number): { x: number; y: number } {
  if (groups.length === 0) return clampPoint(GROUP_GAP + CARD_W / 2 + index * (CARD_W + CARD_GAP), GROUP_GAP + CARD_TOP);
  const first = index < groups.length * LOOPS_PER_GROUP;
  const g = groups[first ? Math.floor(index / LOOPS_PER_GROUP) : index % groups.length];
  const slot = first ? index % LOOPS_PER_GROUP : Math.floor(index / groups.length);
  const cols = colsIn(g);
  return clampPoint(colX(g, slot % cols, cols), firstRow(g) + Math.floor(slot / cols) * (LOOP_CARD_H + CARD_GAP));
}

/** The spot for a drone in a default group: centred in the row between its loops and the bottom row of sequencers. */
export function droneSpot(g: Rect): { x: number; y: number } {
  return clampPoint(g.x + g.w / 2, firstRow(g) + LOOP_CARD_H + CARD_GAP);
}

/** Spots for `n` sequencers side by side along the bottom of a group, under the loops, the whole card inside the group. */
export function bottomRow(g: Rect, n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => clampPoint(colX(g, i, n), g.y + g.h - GROUP_PAD - SEQ_CARD_H + CARD_TOP));
}

/** No other card's circle so near that the two cards would touch (cards hang below their circles, so the check is a box). */
const CELL = { w: CARD_W + 8, h: LOOP_CARD_H + 8 };
const clear = (x: number, y: number, taken: { x: number; y: number }[]) => taken.every((t) => Math.abs(t.x - x) >= CELL.w || Math.abs(t.y - y) >= CELL.h);

/** The first spot inside a group on its card grid where a whole loop card fits clear of the others, or null when the group is full. */
function gridSpot(g: GroupLayout, groups: GroupLayout[], taken: { x: number; y: number }[]): { x: number; y: number } | null {
  const cols = colsIn(g);
  for (let y = firstRow(g); y - CARD_TOP + LOOP_CARD_H <= g.y + g.h; y += LOOP_CARD_H + CARD_GAP) {
    for (let col = 0; col < cols; col++) {
      const p = clampPoint(colX(g, col, cols), y);
      if (containingGroup(groups, p.x, p.y) === g.id && clear(p.x, p.y, taken)) return p;
    }
  }
  return null;
}

/** A free spot inside the group, clear of the other cards, or the group centre when it is full. */
export function spotInGroup(groups: GroupLayout[], groupId: string, taken: { x: number; y: number }[]): { x: number; y: number } {
  const g = groups.find((x) => x.id === groupId);
  if (!g) return clampPoint(VIEW_W / 2, VIEW_H / 2);
  return gridSpot(g, groups, taken) ?? clampPoint(g.x + g.w / 2, g.y + g.h / 2);
}

/**
 * Where a new loop number `index` goes, never on top of another card (a loop or a sequencer): its default spot if
 * that is clear, else a free place in that group, then in the other groups, then outside every group (it plays to the master there).
 */
export function freeSpot(groups: GroupLayout[], index: number, taken: { x: number; y: number }[]): { x: number; y: number } {
  const s = defaultSpot(groups, index);
  if (clear(s.x, s.y, taken)) return s;
  const home = containingGroup(groups, s.x, s.y);
  const order = [...groups.filter((g) => g.id === home), ...groups.filter((g) => g.id !== home)];
  for (const g of order) {
    const p = gridSpot(g, groups, taken);
    if (p) return p;
  }
  return spotOutside(groups, taken) ?? s;
}

/** A card overlaps a group when any of it is inside the group's box. */
const cardTouches = (x: number, y: number, g: Rect) => x + CARD_W / 2 > g.x && x - CARD_W / 2 < g.x + g.w && y + LOOP_CARD_H - CARD_TOP > g.y && y - CARD_TOP < g.y + g.h;

/** A spot on the stage outside every group, the whole card clear of them (so it plays straight to the master), or null when the groups cover everything. */
export function spotOutside(groups: GroupLayout[], taken: { x: number; y: number }[]): { x: number; y: number } | null {
  // the part in view first, top to bottom, then the rest of the stage
  for (const [w, h] of [[VIEW_W, VIEW_H], [STAGE_W, STAGE_H]]) {
    for (let y = CARD_TOP + GROUP_GAP / 2; y - CARD_TOP + LOOP_CARD_H <= h; y += CARD_GAP) {
      for (let x = CARD_W / 2 + GROUP_GAP / 2; x + CARD_W / 2 <= w; x += CARD_GAP) {
        if (groups.every((g) => !cardTouches(x, y, g)) && clear(x, y, taken)) return { x, y };
      }
    }
  }
  return null;
}

/** Something on the stage to arrange: a loop or a sequencer, with the group it is in now (null: outside every group). */
export interface StageItem {
  kind: "loop" | "seq";
  id: string | number;
  groupId: string | null;
}

/**
 * Auto layout: the groups side by side in their order on the stage (left to right, then top to bottom), in rows of DEFAULT_GROUPS,
 * each with its loops on the card grid and its sequencers in rows below them, as tall as that needs (at least a default group).
 * Loops and sequencers outside every group go in a row under the groups. Nothing changes group: a card stays in the group it was in.
 */
export function arrangeStage(groups: GroupLayout[], items: StageItem[]): { groups: GroupLayout[]; spots: { kind: StageItem["kind"]; id: string | number; x: number; y: number }[] } {
  const ordered = [...groups].sort((a, b) => a.y - b.y || a.x - b.x);
  const spots: { kind: StageItem["kind"]; id: string | number; x: number; y: number }[] = [];
  const out: GroupLayout[] = [];
  let top = GROUP_GAP;
  for (let r = 0; r < ordered.length; r += DEFAULT_GROUPS) {
    const row = ordered.slice(r, r + DEFAULT_GROUPS);
    const contents = row.map((g) => ({ loops: items.filter((i) => i.groupId === g.id && i.kind === "loop"), seqs: items.filter((i) => i.groupId === g.id && i.kind === "seq") }));
    const rowsOf = (n: number) => Math.ceil(n / GROUP_COLS);
    const need = (c: (typeof contents)[number]) => GROUP_HEAD + GROUP_PAD * 2 + rowsOf(c.loops.length) * (LOOP_CARD_H + CARD_GAP) + rowsOf(c.seqs.length) * (SEQ_CARD_H + CARD_GAP) - (c.loops.length + c.seqs.length ? CARD_GAP : 0);
    // a row of groups shares one height, so their sequencer rows line up
    const h = Math.max(GROUP_H, ...contents.map(need));
    row.forEach((g, i) => {
      const box = { id: g.id, x: GROUP_GAP + i * (GROUP_W + GROUP_GAP), y: top, w: GROUP_W, h };
      out.push(box);
      const { loops, seqs } = contents[i];
      loops.forEach((it, k) => spots.push({ kind: it.kind, id: it.id, x: colX(box, k % GROUP_COLS, GROUP_COLS), y: firstRow(box) + Math.floor(k / GROUP_COLS) * (LOOP_CARD_H + CARD_GAP) }));
      // sequencers fill rows up from the bottom, so a group's last row sits on its bottom edge like the default
      const seqRows = rowsOf(seqs.length);
      seqs.forEach((it, k) => {
        const fromBottom = seqRows - 1 - Math.floor(k / GROUP_COLS);
        spots.push({ kind: it.kind, id: it.id, x: colX(box, k % GROUP_COLS, GROUP_COLS), y: box.y + box.h - GROUP_PAD - SEQ_CARD_H + CARD_TOP - fromBottom * (SEQ_CARD_H + CARD_GAP) });
      });
    });
    top += h + GROUP_GAP;
  }
  const loose = items.filter((i) => i.groupId === null || !groups.some((g) => g.id === i.groupId));
  const perLine = Math.max(1, Math.floor((STAGE_W - GROUP_GAP) / (CARD_W + CARD_GAP)));
  loose.forEach((it, k) => {
    const p = clampPoint(GROUP_GAP + CARD_W / 2 + (k % perLine) * (CARD_W + CARD_GAP), top + CARD_TOP + Math.floor(k / perLine) * (LOOP_CARD_H + CARD_GAP));
    spots.push({ kind: it.kind, id: it.id, ...p });
  });
  return { groups: out.map((g) => ({ ...g, ...clampRect(g) })), spots };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** Resize a group by dragging one corner by (dx, dy): the opposite corner stays put, the minimum size and the stage edges are respected. */
export function resizeRect(r: Rect, corner: Corner, dx: number, dy: number): Rect {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  let x = r.x;
  let y = r.y;
  let w = r.w;
  let h = r.h;
  if (west) {
    x = Math.min(right - MIN_GROUP_W, Math.max(Math.max(0, right - STAGE_W), r.x + dx));
    w = right - x;
  } else w = Math.min(STAGE_W - r.x, Math.max(MIN_GROUP_W, r.w + dx));
  if (north) {
    y = Math.min(bottom - MIN_GROUP_H, Math.max(Math.max(0, bottom - STAGE_H), r.y + dy));
    h = bottom - y;
  } else h = Math.min(STAGE_H - r.y, Math.max(MIN_GROUP_H, r.h + dy));
  return { x, y, w, h };
}
