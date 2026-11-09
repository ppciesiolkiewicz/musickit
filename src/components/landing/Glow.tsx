import type { CSSProperties } from "react";

/**
 * Soft colour behind a section. Radial gradients, not blurred divs: they fade smoothly with no banding and cost no blur
 * filter. The parent needs `relative isolate` so the glow sits behind its content but above the page background.
 * Sky follows the current music style; amber and violet match the section tones used on the page.
 */
const TONES = { sky: "var(--color-sky-400)", amber: "var(--color-amber-400)", violet: "var(--color-violet-400)", teal: "var(--color-teal-400)" } as const;

export type GlowSpot = { tone: keyof typeof TONES; /** css position, e.g. { right: "-8rem", top: "-6rem" } */ at: CSSProperties; size?: string; strength?: number };

export default function Glow({ spots }: { spots: GlowSpot[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {spots.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            ...s.at,
            width: s.size ?? "36rem",
            height: s.size ?? "36rem",
            background: `radial-gradient(closest-side, color-mix(in oklab, ${TONES[s.tone]} ${Math.round((s.strength ?? 0.2) * 100)}%, transparent), color-mix(in oklab, ${TONES[s.tone]} ${Math.round((s.strength ?? 0.2) * 35)}%, transparent) 55%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}
