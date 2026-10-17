import type { ReactNode } from "react";

/** A small clickable tag on a card. */
export function Tag({ children, on, onClick, tone = "form" }: { children: ReactNode; on?: boolean; onClick?: () => void; tone?: "form" | "style" | "mode" | "degree" }) {
  const tones = {
    form: "border-slate-700 text-slate-400",
    style: "border-violet-500/40 text-violet-300",
    mode: "border-teal-500/40 text-teal-300",
    degree: "border-sky-500/40 text-sky-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2 py-0.5 text-xs transition hover:bg-slate-800 ${tones[tone]} ${on ? "bg-sky-500/20 !text-sky-100 !border-sky-400" : ""}`}
    >
      {children}
    </button>
  );
}
