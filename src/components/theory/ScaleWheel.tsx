import { DOT_INK, degreeColour } from "@/features/theory/scales";

/**
 * A scale drawn on the ring of twelve notes: the root at the top, a half step every 30°, the scale's notes joined into a shape whose
 * edges take each degree's colour. `compare` draws another scale (usually plain major) as a dashed outline, and the notes that differ
 * from it are ringed, so a mode's character notes stand out. With `compareLabels` it marks the overlap instead: a double ring on each
 * note both scales have, and a hollow ghost dot, labelled, where only the compared scale has a note. Tapping a dot calls `onNote` with its degree; `active` lights one.
 */
export default function ScaleWheel({ steps, degrees, labels, compare, compareLabels, active = null, onNote, size = 260, ringLabels, className = "" }: {
  steps: number[];
  /** the degree of a seven-note scale each step is, for colour (a pentatonic's 5th is degree 4); default the index */
  degrees?: number[];
  /** one per degree, drawn in the dots: degree numbers ("R", "♭3") or note names */
  labels: string[];
  compare?: number[];
  /** one per `compare` note ("3"): switches to marking the shared notes and ghosting the compared scale's own */
  compareLabels?: string[];
  active?: number | null;
  onNote?: (degree: number) => void;
  size?: number;
  /** names for the twelve ring positions from the root, e.g. the chromatic note names in the key */
  ringLabels?: string[];
  className?: string;
}) {
  const S = 200;
  const C = S / 2;
  const R = ringLabels ? 70 : 78;
  const at = (semis: number, r = R) => {
    const a = ((semis * 30 - 90) * Math.PI) / 180;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  };
  const pts = steps.map((s) => at(s));
  const deg = (d: number) => degrees?.[d] ?? d;
  const colour = (d: number) => degreeColour(deg(d));
  // ringed: the notes the compared scale does not have (works for any sizes: a pentatonic against a mode, or another pentatonic)
  const overlap = !!compare && !!compareLabels;
  const changed = steps.map((s) => !overlap && !!compare && !compare.includes(s));
  const shared = steps.map((s) => overlap && compare!.includes(s));
  const ghosts = overlap ? compare!.flatMap((s, i) => (steps.includes(s) ? [] : [{ s, label: compareLabels![i] }])) : [];
  const dotR = 11;

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={size} height={size} className={`select-none ${className}`} role="img" aria-label={`The scale on the ring of twelve notes: ${labels.join(", ")}`}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-slate-700)" strokeOpacity={0.7} strokeDasharray="2 5" />
      {Array.from({ length: 12 }, (_, k) => {
        const p = at(k);
        return <circle key={k} cx={p.x} cy={p.y} r={2} fill="var(--color-slate-700)" />;
      })}
      {ringLabels?.map((n, k) => {
        const p = at(k, R + 22);
        return (
          <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={steps.includes(k) ? "var(--color-slate-300)" : "var(--color-slate-600)"}>
            {n}
          </text>
        );
      })}
      {compare && (
        <polygon points={compare.map((s) => { const p = at(s); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="var(--color-slate-500)" strokeWidth={1.2} strokeDasharray="3 3" strokeLinejoin="round" />
      )}
      {ghosts.map(({ s: g, label }) => {
        const p = at(g);
        return (
          <g key={`g${g}`} pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={dotR - 1} fill="var(--color-slate-950)" stroke="var(--color-slate-400)" strokeWidth={1.2} strokeDasharray="2.5 2" />
            <text x={p.x} y={p.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={label.length > 1 ? 7.5 : 9} fontWeight={600} fill="var(--color-slate-300)">{label}</text>
          </g>
        );
      })}
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="var(--color-sky-400)" fillOpacity={0.1} stroke="none" />
      {/* each edge in the colour of the degree it leaves from */}
      {pts.map((p, d) => {
        const q = pts[(d + 1) % pts.length];
        return <line key={d} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={colour(d)} strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />;
      })}
      {active !== null && active < pts.length && <line x1={C} y1={C} x2={pts[active].x} y2={pts[active].y} stroke={colour(active)} strokeWidth={2} strokeLinecap="round" />}
      {pts.map((p, d) => (
        <g key={d} className={onNote ? "cursor-sound" : undefined} onClick={onNote ? () => onNote(d) : undefined}>
          {onNote && <title>{`${labels[d]}: tap to hear it`}</title>}
          {shared[d] && (
            <>
              <circle cx={p.x} cy={p.y} r={dotR + 3} fill="none" stroke={colour(d)} strokeWidth={1.1} />
              <circle cx={p.x} cy={p.y} r={dotR + 5.5} fill="none" stroke={colour(d)} strokeWidth={1.1} />
            </>
          )}
          {changed[d] && <circle cx={p.x} cy={p.y} r={dotR + 4.5} fill="none" stroke={colour(d)} strokeWidth={1.6} strokeDasharray="2.5 2.5" />}
          <circle cx={p.x} cy={p.y} r={active === d ? dotR + 2 : dotR} fill={colour(d)} stroke={active === d ? "var(--color-sky-300)" : d === 0 ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={active === d ? 2.5 : d === 0 ? 2 : 1.2} />
          <text x={p.x} y={p.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={labels[d].length > 1 ? 8 : 10} fontWeight={700} fill={DOT_INK} pointerEvents="none">
            {labels[d]}
          </text>
        </g>
      ))}
    </svg>
  );
}
