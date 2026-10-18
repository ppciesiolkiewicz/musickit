/**
 * Colour coding for rows of look-alike buttons, so each option is found by colour as well as by name. The hues are theme
 * scales (every theme remaps them), and every class is written out whole so Tailwind sees it.
 */

export type Hue = "sky" | "emerald" | "amber" | "rose" | "violet" | "teal" | "pink" | "red";

/** In an order where neighbours differ clearly. */
export const HUES: Hue[] = ["sky", "amber", "emerald", "rose", "violet", "teal", "pink", "red"];

/** The hue of the i-th option of a row, wrapping round. */
export const hueAt = (i: number): Hue => HUES[((i % HUES.length) + HUES.length) % HUES.length];

export interface HueTone {
  /** border, fill and text of the chosen option */
  on: string;
  /** border and hover of the others: neutral at rest, tinted on hover */
  off: string;
  /** the hue as a text colour, for an icon or a dot on an option that is not chosen */
  ink: string;
  /** the hue as a soft disc behind an icon: [not chosen, chosen] */
  disc: [string, string];
}

export const HUE_TONES: Record<Hue, HueTone> = {
  sky: {
    on: "border-sky-400/80 bg-sky-500/20 text-sky-50 shadow-sm shadow-sky-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-sky-500/50 hover:bg-sky-500/5 hover:text-slate-100",
    ink: "text-sky-300",
    disc: ["bg-sky-500/10 text-sky-300", "bg-sky-400/25 text-sky-50"],
  },
  amber: {
    on: "border-amber-400/80 bg-amber-500/20 text-amber-50 shadow-sm shadow-amber-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-slate-100",
    ink: "text-amber-300",
    disc: ["bg-amber-500/10 text-amber-300", "bg-amber-400/25 text-amber-50"],
  },
  emerald: {
    on: "border-emerald-400/80 bg-emerald-500/20 text-emerald-50 shadow-sm shadow-emerald-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-slate-100",
    ink: "text-emerald-300",
    disc: ["bg-emerald-500/10 text-emerald-300", "bg-emerald-400/25 text-emerald-50"],
  },
  rose: {
    on: "border-rose-400/80 bg-rose-500/20 text-rose-50 shadow-sm shadow-rose-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-slate-100",
    ink: "text-rose-300",
    disc: ["bg-rose-500/10 text-rose-300", "bg-rose-400/25 text-rose-50"],
  },
  violet: {
    on: "border-violet-400/80 bg-violet-500/20 text-violet-50 shadow-sm shadow-violet-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-slate-100",
    ink: "text-violet-300",
    disc: ["bg-violet-500/10 text-violet-300", "bg-violet-400/25 text-violet-50"],
  },
  teal: {
    on: "border-teal-400/80 bg-teal-500/20 text-teal-50 shadow-sm shadow-teal-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-teal-500/50 hover:bg-teal-500/5 hover:text-slate-100",
    ink: "text-teal-300",
    disc: ["bg-teal-500/10 text-teal-300", "bg-teal-400/25 text-teal-50"],
  },
  pink: {
    on: "border-pink-400/80 bg-pink-500/20 text-pink-50 shadow-sm shadow-pink-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-pink-500/50 hover:bg-pink-500/5 hover:text-slate-100",
    ink: "text-pink-300",
    disc: ["bg-pink-500/10 text-pink-300", "bg-pink-400/25 text-pink-50"],
  },
  red: {
    on: "border-red-400/80 bg-red-500/20 text-red-50 shadow-sm shadow-red-500/20",
    off: "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-red-500/50 hover:bg-red-500/5 hover:text-slate-100",
    ink: "text-red-300",
    disc: ["bg-red-500/10 text-red-300", "bg-red-400/25 text-red-50"],
  },
};

/** The classes of one colour-coded option, chosen or not. */
export const hueClass = (hue: Hue, on: boolean) => (on ? HUE_TONES[hue].on : HUE_TONES[hue].off);
