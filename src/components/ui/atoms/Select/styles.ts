export type SelectSize = "2xs" | "xs" | "sm" | "md" | "lg";

/** The closed control: the same look for the native select and the menu trigger. */
const base =
  "inline-flex min-w-0 items-center justify-between gap-1.5 border border-slate-700/80 bg-slate-900 text-slate-100 shadow-sm shadow-black/10 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400 disabled:pointer-events-none disabled:opacity-40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

const sizes: Record<SelectSize, string> = {
  "2xs": "h-4 rounded pl-1 pr-0.5 text-[10px]",
  xs: "h-6 rounded-md pl-1.5 pr-1 text-[11px]",
  sm: "h-7 rounded-md pl-2 pr-1.5 text-xs",
  md: "h-8 rounded-lg pl-2.5 pr-2 text-xs",
  lg: "h-9 rounded-lg pl-3 pr-2.5 text-sm",
};

export const triggerClass = (size: SelectSize, highlighted = false) => `${base} ${sizes[size]} ${highlighted ? "!border-sky-400" : ""}`;

export const chevronSize: Record<SelectSize, number> = { "2xs": 8, xs: 10, sm: 12, md: 12, lg: 14 };

export const menuClass =
  "z-[2100] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 p-1 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur";

export const itemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-7 pr-3 text-xs text-slate-200 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-sky-500/15 data-[highlighted]:text-sky-50 data-[state=checked]:text-sky-100";

export const groupLabelClass = "px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-slate-500";
