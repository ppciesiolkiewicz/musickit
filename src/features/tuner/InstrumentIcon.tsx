import type { ReactNode } from "react";
import type { InstrumentId } from "@/features/theory";

/* Upright line drawings on a 24 × 24 grid, stroked in currentColor like the Lucide icons. Scaled groups divide the stroke width back. */

const guitarBody = "M12 8.3C9.6 8.3 8.4 10 8.8 12C9 13 7.5 13.6 7.5 17.3C7.5 20 9.5 22 12 22C14.5 22 16.5 20 16.5 17.3C16.5 13.6 15 13 15.2 12C15.6 10 14.4 8.3 12 8.3Z";
const violinBody = "M12 9C9.5 9 8.5 10.2 9 12C9.3 13 8.2 13.5 8.6 14.5C9 15.3 7.5 16 7.5 18.5C7.5 21 9.5 22.5 12 22.5C14.5 22.5 16.5 21 16.5 18.5C16.5 16 15 15.3 15.4 14.5C15.8 13.5 14.7 13 15 12C15.5 10.2 14.5 9 12 9Z";

const guitar = (
  <>
    <path d={guitarBody} />
    <path d="M12 8.3V3.5" />
    <rect x="10.8" y="1" width="2.4" height="2.5" rx="0.5" />
    <circle cx="12" cy="14.8" r="1.3" />
    <path d="M10.5 19h3" />
  </>
);

const violin = (
  <>
    <path d={violinBody} />
    <path d="M12 9V3.5" />
    <circle cx="12" cy="2.5" r="1" />
    <path d="M10.4 15v3M13.6 15v3" />
  </>
);

const SHAPES: Record<InstrumentId, ReactNode> = {
  chromatic: (
    <>
      <path d="M9 2v7a3 3 0 0 0 6 0V2" />
      <path d="M12 12v10" />
    </>
  ),
  guitar,
  bass: (
    <>
      <g transform="translate(12 22) scale(0.82) translate(-12 -22)" strokeWidth={1.5 / 0.82}>
        <path d={guitarBody} />
        <rect x="10" y="15" width="4" height="1.6" rx="0.4" />
      </g>
      <path d="M12 10.8V3.5" />
      <rect x="10.8" y="1" width="2.4" height="2.5" rx="0.5" />
    </>
  ),
  ukulele: (
    <>
      <g transform="translate(12 22) scale(0.68) translate(-12 -22)" strokeWidth={1.5 / 0.68}>
        <path d={guitarBody} />
        <circle cx="12" cy="14.8" r="1.4" />
      </g>
      <path d="M12 12.4V7.5" />
      <rect x="10.8" y="5" width="2.4" height="2.5" rx="0.5" />
    </>
  ),
  violin: <g transform="translate(12 12) scale(0.8) translate(-12 -12)" strokeWidth={1.5 / 0.8}>{violin}</g>,
  viola: <g transform="translate(12 12) scale(0.9) translate(-12 -12)" strokeWidth={1.5 / 0.9}>{violin}</g>,
  cello: (
    <>
      <g transform="translate(12 11) scale(0.95) translate(-12 -12)" strokeWidth={1.5 / 0.95}>{violin}</g>
      <path d="M12 21V23.5" />
    </>
  ),
  mandolin: (
    <>
      <path d="M12 10C8.5 10 7 14 7 17C7 20 9.2 22 12 22C14.8 22 17 20 17 17C17 14 15.5 10 12 10Z" />
      <path d="M12 10V4" />
      <rect x="10.5" y="1.2" width="3" height="2.8" rx="0.6" />
      <circle cx="12" cy="15" r="1.3" />
    </>
  ),
  banjo: (
    <>
      <circle cx="12" cy="17" r="5" />
      <circle cx="12" cy="17" r="3.4" />
      <path d="M12 12V3.5" />
      <rect x="10.8" y="1" width="2.4" height="2.5" rx="0.5" />
      <path d="M12 8h1.6" />
    </>
  ),
};

export default function InstrumentIcon({ id, size = 24, className }: { id: InstrumentId; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {SHAPES[id]}
    </svg>
  );
}
