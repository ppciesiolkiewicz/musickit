/**
 * The looping stage: groups are coloured rectangles on a canvas, loops are circles. A loop belongs to the group whose rectangle
 * holds the loop's centre. Pure geometry, unit tested. Coordinates are in stage units (STAGE_W by STAGE_H).
 */

/** The whole stage: groups and loops can be anywhere on it. */
export const STAGE_W = 2000;
export const STAGE_H = 1200;
/** The part that is in view at 100% and where the default groups sit; the rest is room to grow into. */
export const VIEW_W = 1400;
export const VIEW_H = 760;
export const LOOP_R = 46;
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

/** Keep a loop's circle fully on the stage. */
export function clampPoint(x: number, y: number): { x: number; y: number } {
  return { x: Math.min(STAGE_W - LOOP_R, Math.max(LOOP_R, x)), y: Math.min(STAGE_H - LOOP_R, Math.max(LOOP_R, y)) };
}

export const DEFAULT_GROUPS = 5;
/** Loops each default group starts with: two by two, the sequencers below them. */
export const LOOPS_PER_GROUP = 4;
/** Room one loop and its controls (length, name, buttons, volume) take: columns and rows of loops are this far apart at least. */
export const LOOP_CELL = { w: LOOP_R * 2 + 24, h: LOOP_R * 2 + 120 };

/** Five side-by-side groups (five buses) filling the stage. */
/** height left free below the default groups: loops and sequencers placed there play straight to the master */
export const FREE_STRIP = 96;

export function defaultGroups(): GroupLayout[] {
  const gap = 20;
  const w = (VIEW_W - gap * (DEFAULT_GROUPS + 1)) / DEFAULT_GROUPS;
  return Array.from({ length: DEFAULT_GROUPS }, (_, i) => i).map((i) => ({ id: `g${i + 1}`, x: gap + i * (w + gap), y: gap, w, h: VIEW_H - gap * 2 - FREE_STRIP }));
}

/**
 * A spot for loop number `index`: inside the group `index % groups`, stacked so circles do not overlap. The first
 * `groups * LOOPS_PER_GROUP` loops fill the groups one after the other instead (loops 1 to 4 in the first group).
 */
export function defaultSpot(groups: GroupLayout[], index: number): { x: number; y: number } {
  if (groups.length === 0) return clampPoint(LOOP_R + index * (LOOP_R * 2 + 12), VIEW_H / 2);
  const first = index < groups.length * LOOPS_PER_GROUP;
  const g = groups[first ? Math.floor(index / LOOPS_PER_GROUP) : index % groups.length];
  const slot = first ? index % LOOPS_PER_GROUP : Math.floor(index / groups.length);
  // columns spread evenly across the group, as many as there is room for with their controls
  const perRow = Math.max(1, Math.floor((g.w - 4) / LOOP_CELL.w));
  const col = slot % perRow;
  const row = Math.floor(slot / perRow);
  return clampPoint(g.x + ((col + 0.5) * g.w) / perRow, g.y + 60 + LOOP_R + row * LOOP_CELL.h);
}

/** Spots for `n` sequencers side by side along the bottom of a group, under the loops (a loop's controls hang below its circle). */
export function bottomRow(g: Rect, n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => clampPoint(g.x + ((i + 0.5) * g.w) / n, g.y + g.h - 108));
}

const apart = (x: number, y: number, taken: { x: number; y: number }[]) => taken.every((t) => Math.hypot(t.x - x, t.y - y) >= LOOP_R * 1.6);

/** A free spot inside the group, clear of the other circles, or the group centre when it is full. */
export function spotInGroup(groups: GroupLayout[], groupId: string, taken: { x: number; y: number }[]): { x: number; y: number } {
  const g = groups.find((x) => x.id === groupId);
  if (!g) return clampPoint(VIEW_W / 2, VIEW_H / 2);
  const step = LOOP_R * 1.7;
  for (let y = g.y + 50 + LOOP_R; y <= g.y + g.h - LOOP_R; y += step) {
    for (let x = g.x + 20 + LOOP_R; x <= g.x + g.w - LOOP_R; x += step) {
      const p = clampPoint(x, y);
      if (containingGroup(groups, p.x, p.y) === groupId && apart(p.x, p.y, taken)) return p;
    }
  }
  return clampPoint(g.x + g.w / 2, g.y + g.h / 2);
}

/** A spot on the stage outside every group (so a circle there plays straight to the master), or null when the groups cover everything. */
export function spotOutside(groups: GroupLayout[], taken: { x: number; y: number }[]): { x: number; y: number } | null {
  const step = LOOP_R * 1.7;
  // the part in view first, then the rest of the stage
  for (const [w, h] of [[VIEW_W, VIEW_H], [STAGE_W, STAGE_H]]) {
    for (let y = h - LOOP_R; y >= LOOP_R; y -= step) {
      for (let x = LOOP_R; x <= w - LOOP_R; x += step) {
        if (containingGroup(groups, x, y) === null && apart(x, y, taken)) return { x, y };
      }
    }
  }
  return null;
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
