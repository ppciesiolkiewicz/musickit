/* one dot per scale degree, 1 to 7, as on attunr.app */
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];

/** The attunr wordmark with a row of seven coloured dots, under it or (`dots="side"`) after it: lowercase Outfit semibold under Default,
 * the style's headline face otherwise (themes.css). */
export default function Wordmark({ className = "", dots = "under" }: { className?: string; dots?: "under" | "side" }) {
  const side = dots === "side";
  return (
    <span className={`inline-flex items-center whitespace-nowrap leading-none text-slate-100 ${side ? "gap-[0.3em]" : "flex-col"} ${className}`}>
      <span
        style={{
          fontFamily: "var(--brand-font, var(--font-brand)), sans-serif",
          fontWeight: "var(--brand-weight, 600)" as unknown as number,
          letterSpacing: "var(--brand-tracking, -0.025em)",
        }}
      >
        attunr
      </span>
      <span aria-hidden className={`flex ${side ? "mt-[0.12em] gap-[0.12em]" : "mt-[0.14em] gap-[0.09em]"}`}>
        {DOTS.map((c) => (
          <span key={c} className={`block rounded-full ${side ? "h-[0.24em] w-[0.24em]" : "h-[0.17em] w-[0.17em]"}`} style={{ background: c }} />
        ))}
      </span>
    </span>
  );
}
