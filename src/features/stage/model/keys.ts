/**
 * The studio's keyboard shortcuts: one list (shown in the Keys panel and the ? overlay) and one matcher. Keys match
 * `KeyboardEvent.code`, so other keyboard layouts work, and nothing fires while typing in a field.
 */

export type Shortcut =
  | "palette"
  | "delete"
  | "nudge-left"
  | "nudge-right"
  | "nudge-up"
  | "nudge-down"
  | "grow-w"
  | "shrink-w"
  | "grow-h"
  | "shrink-h"
  | "deselect"
  | "camera-corner"
  | "camera-toggle"
  | "screen-toggle"
  | "help";

export interface KeyInfo {
  shortcut: Shortcut;
  keys: string;
  label: string;
  needsSelection: boolean;
}

/** nudge steps, as fractions of the frame; Shift takes the big one */
export const NUDGE = 0.01;
export const NUDGE_BIG = 0.05;

export const KEYS: KeyInfo[] = [
  { shortcut: "palette", keys: "/  or  ⌘K", label: "Add a widget", needsSelection: false },
  { shortcut: "camera-corner", keys: "C", label: "Camera (minimized)", needsSelection: false },
  { shortcut: "camera-toggle", keys: "F", label: "Fullscreen or minimize camera", needsSelection: false },
  { shortcut: "screen-toggle", keys: "⇧F", label: "Fullscreen or minimize screen share", needsSelection: false },
  { shortcut: "nudge-left", keys: "←", label: "Move left (Shift: more)", needsSelection: true },
  { shortcut: "nudge-right", keys: "→", label: "Move right", needsSelection: true },
  { shortcut: "nudge-up", keys: "↑", label: "Move up", needsSelection: true },
  { shortcut: "nudge-down", keys: "↓", label: "Move down", needsSelection: true },
  { shortcut: "grow-w", keys: "⌥ →", label: "Wider", needsSelection: true },
  { shortcut: "shrink-w", keys: "⌥ ←", label: "Narrower", needsSelection: true },
  { shortcut: "grow-h", keys: "⌥ ↓", label: "Taller", needsSelection: true },
  { shortcut: "shrink-h", keys: "⌥ ↑", label: "Shorter", needsSelection: true },
  { shortcut: "delete", keys: "⌫", label: "Delete the widget", needsSelection: true },
  { shortcut: "deselect", keys: "Esc", label: "Deselect", needsSelection: true },
  { shortcut: "help", keys: "?", label: "All keys", needsSelection: false },
];

const ARROWS: Record<string, [Shortcut, Shortcut]> = {
  ArrowLeft: ["nudge-left", "shrink-w"],
  ArrowRight: ["nudge-right", "grow-w"],
  ArrowUp: ["nudge-up", "shrink-h"],
  ArrowDown: ["nudge-down", "grow-h"],
};

export function shortcutFor(
  e: { code: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean },
  ctx: { typing: boolean; hasSelection: boolean },
): Shortcut | null {
  if (ctx.typing) return null;
  const cmd = e.metaKey || e.ctrlKey;
  if (e.code === "KeyK" && cmd) return "palette";
  if (cmd) return null;
  if (e.code === "Slash") return e.shiftKey ? "help" : "palette";
  if (e.code === "KeyC" && !e.altKey) return "camera-corner";
  if (e.code === "KeyF" && !e.altKey) return e.shiftKey ? "screen-toggle" : "camera-toggle";
  if (!ctx.hasSelection) return null;
  if (e.code in ARROWS) return ARROWS[e.code][e.altKey ? 1 : 0];
  if (e.code === "Backspace" || e.code === "Delete") return "delete";
  if (e.code === "Escape") return "deselect";
  return null;
}
