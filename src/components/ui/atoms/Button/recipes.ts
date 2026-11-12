/*
 * Shared control styles: one look for buttons across the app. Colours come from the theme tokens (slate = neutral, sky = accent),
 * so every theme restyles them. Add `!`-prefixed classes after these to colour a special state (mute, record, playing).
 */

/** Interaction shared by every control: hover lift, press, pressed state (aria-pressed), focus ring, disabled. */
const feel =
  "transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400 aria-pressed:border-sky-500/60 aria-pressed:bg-sky-500/15 aria-pressed:text-sky-100";

/** The neutral surface of a control. */
const surface = "border border-slate-700/80 bg-slate-900 text-slate-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_2px_rgb(0_0_0/0.15)] hover:border-slate-600 hover:bg-slate-800 hover:text-slate-50";

/** On a desktop (lg) every size grows a step: a mouse needs less than a finger, but the dense mobile sizes read as cramped on a big screen. */

/** Text button without colours, for coloured variants (primary, danger). */
export const btnBase = `inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium lg:px-4 lg:py-2 lg:text-sm ${feel}`;
/** Smaller text button without colours. */
export const btnBaseSm = `inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium lg:gap-1.5 lg:px-3.5 lg:py-1.5 lg:text-sm ${feel}`;

/** Neutral text button. */
export const btn = `${btnBase} ${surface}`;
/** Smaller neutral text button. */
export const btnSm = `${btnBaseSm} ${surface}`;

/** Icon button, 32 px: toolbars and headers. */
export const ibtn = `grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-xs lg:h-9 lg:min-w-9 lg:px-2 lg:text-sm ${surface} ${feel}`;
/** Icon button, 28 px: panels. */
export const sbtn = `grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[11px] lg:h-8 lg:min-w-8 lg:rounded-lg lg:text-xs ${surface} ${feel}`;
/** Icon button, 24 px: dense rows (loops, strips, widgets). */
export const tbtn = `grid h-6 min-w-6 place-items-center rounded-md px-1 text-[10px] font-semibold lg:h-7 lg:min-w-7 lg:px-1.5 lg:text-[11px] ${surface} ${feel}`;
