import { STYLES, type StyleId } from "@/features/styles/styles";

/** Each style's divider line, drawn in a 600×24 box and mirrored on the right. */
const PATHS: Partial<Record<StyleId, string>> = {
  funk: "M0 12 C25 0 50 24 75 12 S125 0 150 12 S200 24 225 12 S275 0 300 12 S350 24 375 12 S425 0 450 12 S500 24 525 12 S575 0 600 12",
  metal: "M0 12 L40 12 L52 2 L64 22 L76 6 L88 18 L100 12 L600 12",
  blues: "M0 14 C60 10 120 18 180 13 S300 9 360 14 S480 17 600 12",
  rock: "M0 8 L600 8 M0 16 L600 16",
  jazz: "M0 9 H600 M0 15 H600",
  surf: "M0 16 C40 16 50 4 90 4 C120 4 120 14 105 14 C95 14 100 8 110 9 M110 16 C150 16 160 4 200 4 C230 4 230 14 215 14 C205 14 210 8 220 9 M220 16 C260 16 270 4 310 4 C340 4 340 14 325 14 C315 14 320 8 330 9 M330 16 C370 16 380 4 420 4 C450 4 450 14 435 14 C425 14 430 8 440 9 M440 16 C480 16 490 4 530 4 C560 4 560 14 545 14 C535 14 540 8 550 9 M550 16 H600",
};

function Line({ d, thick, flip }: { d: string; thick: boolean; flip?: boolean }) {
  return (
    <svg viewBox="0 0 600 24" preserveAspectRatio="none" className="h-6 min-w-0 flex-1 text-sky-400/70" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={thick ? 3 : 2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small line between the hero and the next section, in the current style's own shape and words. Plain has none. */
export default function StyleDivider() {
  return (
    <div aria-hidden>
      {STYLES.filter((s) => s.divider && PATHS[s.id]).map((s) => (
        <div key={s.id} data-style-only={s.id}>
          <div className="flex items-center gap-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-400">
            <Line d={PATHS[s.id]!} thick={s.id === "rock"} />
            <span className="whitespace-nowrap">{s.divider!.text}</span>
            <Line d={PATHS[s.id]!} thick={s.id === "rock"} flip />
          </div>
        </div>
      ))}
    </div>
  );
}
