/**
 * The looping stage: groups are coloured rectangles on a canvas, loops are circles. A loop belongs to the group whose rectangle
 * holds the loop's centre. Pure geometry, unit tested. Coordinates are in stage units (STAGE_W by STAGE_H).
 */

export const STAGE_W = 1000;
export const STAGE_H = 460;
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

/** Three side-by-side groups filling the stage. */
export function defaultGroups(): GroupLayout[] {
  const gap = 16;
  const w = (STAGE_W - gap * 4) / 3;
  return [0, 1, 2].map((i) => ({ id: `g${i + 1}`, x: gap + i * (w + gap), y: gap, w, h: STAGE_H - gap * 2 }));
}

/** A spot for loop number `index` of `total`: inside the group `index % groups`, stacked so circles do not overlap. */
export function defaultSpot(groups: GroupLayout[], index: number): { x: number; y: number } {
  if (groups.length === 0) return clampPoint(LOOP_R + index * (LOOP_R * 2 + 12), STAGE_H / 2);
  const g = groups[index % groups.length];
  const slot = Math.floor(index / groups.length);
  const perRow = Math.max(1, Math.floor((g.w - 20) / (LOOP_R * 2 + 12)));
  const col = slot % perRow;
  const row = Math.floor(slot / perRow);
  return clampPoint(g.x + 20 + LOOP_R + col * (LOOP_R * 2 + 12), g.y + 50 + LOOP_R + row * (LOOP_R * 2 + 56));
}
