import { FOUNDING_PARTNERS_JOINED, FOUNDING_PARTNERS_NEEDED } from "@/lib/foundingOffer";

/*
 * The picture behind the founding-partner page: a ring of seats, one for each founding partner the project needs, each
 * joined to the centre, with rings spreading out like a sound. A seat lights up when a partner has joined. It is
 * centred on its parent (the count, which needs `relative`), so the number is the hub the seats turn round, and it
 * sits behind the page's content (an ancestor needs `isolate`) and fades out at its edges.
 */

const SIZE = 1200;
const C = SIZE / 2;
const SEAT_RING = 400;
const RINGS = [150, 235, 320, 400, 480, 560];
const FADE = "radial-gradient(closest-side, black 35%, transparent 96%)";

export default function FoundingBackdrop() {
  const seats = Array.from({ length: FOUNDING_PARTNERS_NEEDED }, (_, i) => {
    const a = (i / FOUNDING_PARTNERS_NEEDED) * Math.PI * 2 - Math.PI / 2;
    // rounded, so the server and the browser write the same numbers
    return { x: Math.round(C + Math.cos(a) * SEAT_RING), y: Math.round(C + Math.sin(a) * SEAT_RING), joined: i < FOUNDING_PARTNERS_JOINED };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[max(64rem,105vw)] max-w-none -translate-x-1/2 -translate-y-1/2" style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
      {/* a wash of colour under the rings */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-sky-400) 20%, transparent), color-mix(in oklab, var(--color-violet-400) 9%, transparent) 55%, transparent)" }} />
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full">
        {RINGS.map((r, i) => (
          <circle key={r} cx={C} cy={C} r={r} fill="none" strokeWidth="1" strokeDasharray={r === SEAT_RING ? undefined : "2 9"} style={{ stroke: "var(--color-sky-300)", opacity: 0.34 - i * 0.04 }} />
        ))}
        {/* the seats turn slowly round the centre */}
        <g className="origin-center animate-[spin_240s_linear_infinite] motion-reduce:animate-none">
          {seats.map((s, i) => (
            <g key={i}>
              <line x1={C} y1={C} x2={s.x} y2={s.y} strokeWidth="1" style={{ stroke: "var(--color-sky-300)", opacity: s.joined ? 0.45 : 0.1 }} />
              {s.joined && <circle cx={s.x} cy={s.y} r="22" style={{ fill: "var(--color-sky-400)", opacity: 0.22 }} />}
              <circle cx={s.x} cy={s.y} r="9" strokeWidth="2" style={{ fill: s.joined ? "var(--color-sky-300)" : "var(--color-slate-950)", stroke: "var(--color-sky-300)", opacity: s.joined ? 1 : 0.6 }} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
