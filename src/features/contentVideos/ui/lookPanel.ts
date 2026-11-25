import type { CSSProperties } from "react";
import { DEFAULT_BOX, type Box, type Look } from "../model/overlay";

/**
 * The classes of the panel the tool sits in over the camera (recording) or over the video (playback), from its look.
 * Written out whole so Tailwind finds them. On playback the panel keeps clear of the video's own controls at the bottom,
 * except a free one, which sits where it was put (`panelStyle`) with its tool scaled to its width (`Scaled`, which pads it).
 */
const SPAN = {
  across: { small: "max-h-[40%]", medium: "max-h-[60%]", large: "max-h-[80%]" },
  side: { small: "w-[35%]", medium: "w-1/2", large: "w-[65%]" },
} as const;

const AT = {
  record: { bottom: "inset-x-0 bottom-0", top: "inset-x-0 top-0", left: "inset-y-0 left-0", right: "inset-y-0 right-0" },
  play: { bottom: "inset-x-0 bottom-12", top: "inset-x-0 top-0", left: "left-0 top-0 bottom-12", right: "right-0 top-0 bottom-12" },
} as const;

const BG = { dark: "bg-slate-950/75 backdrop-blur-sm", clear: "bg-slate-950/25" } as const;

export function panelClass(look: Look, on: "record" | "play"): string {
  const clip = on === "record" ? "overflow-auto" : "pointer-events-none overflow-hidden";
  if (look.place === "free") return `absolute ${BG[look.bg]} ${clip}`;
  const side = look.place === "left" || look.place === "right";
  const span = side ? SPAN.side[look.size] : SPAN.across[look.size];
  return `absolute ${AT[on][look.place]} ${span} ${BG[look.bg]} p-2 ${clip}`;
}

/**
 * A free panel's place and width, as shares of the picture (`unset` until it is moved); none for the other places (their classes place them). Its
 * height follows the tool, scaled to that width (`Scaled`), so the tool keeps its proportions at any size.
 */
export function panelStyle(look: Look, unset: Box = DEFAULT_BOX): CSSProperties | undefined {
  if (look.place !== "free") return undefined;
  const b = look.box ?? unset;
  return { left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%` };
}

/** a free panel's background, for the box inside its drag bar */
export const panelBg = (look: Look): string => BG[look.bg];

export const PLACE_WORDS: Record<Look["place"], string> = { bottom: "Bottom", top: "Top", left: "Left", right: "Right", free: "Free" };
export const SIZE_WORDS: Record<Look["size"], string> = { small: "Small", medium: "Medium", large: "Large" };
export const BG_WORDS: Record<Look["bg"], string> = { dark: "Dark", clear: "Clear" };
