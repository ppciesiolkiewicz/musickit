"use client";

import * as RSlider from "@radix-ui/react-slider";
import type { Hue } from "../Hue";

/** fill and thumb per hue, written out whole so Tailwind sees them */
const FILL: Record<Hue, string> = {
  sky: "bg-sky-400", amber: "bg-amber-400", emerald: "bg-emerald-400", rose: "bg-rose-400",
  violet: "bg-violet-400", teal: "bg-teal-400", pink: "bg-pink-400", red: "bg-red-400",
};

/**
 * The app's slider (Radix Slider styled with the theme tokens). Use it instead of `<input type="range">`.
 * The thumb stays out of the tab order like every other control (`NoControlFocus`), so the computer keyboard keeps playing notes.
 */
export default function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 1,
  disabled,
  size = "md",
  hue = "sky",
  className = "",
  title,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** sm: dense rows (loops, inputs); md: everywhere else */
  size?: "sm" | "md";
  /** the fill's colour, for a row of colour-coded sliders (a mixer); sky by default */
  hue?: Hue;
  className?: string;
  title?: string;
  "aria-label": string;
}) {
  const sm = size === "sm";
  return (
    <RSlider.Root
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      title={title}
      className={`group relative flex touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 ${sm ? "h-4 min-w-10" : "h-5 min-w-16"} ${className}`}
    >
      <RSlider.Track className={`relative grow overflow-hidden rounded-full bg-slate-700/70 ${sm ? "h-1" : "h-1.5"}`}>
        <RSlider.Range className={`absolute h-full rounded-full ${FILL[hue]}`} />
      </RSlider.Track>
      <RSlider.Thumb
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`block cursor-grab rounded-full ${FILL[hue]} shadow-md shadow-black/30 ring-2 ring-slate-950 transition-transform hover:scale-110 active:scale-125 active:cursor-grabbing focus:outline-none focus-visible:ring-sky-200 group-data-[disabled]:pointer-events-none ${sm ? "h-3 w-3" : "h-4 w-4"}`}
      />
    </RSlider.Root>
  );
}
