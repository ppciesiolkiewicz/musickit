"use client";

import { Button } from "@/components/ui";

/** A microphone, for the sing buttons. */
function Mic({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v5" />
    </svg>
  );
}

/** The mic toggle on the scale and on each melody card: "Start the microphone" with a mic while it's off, green "Stop the mic" while it listens (or the card's own words). */
export default function MicButton({ on, onClick, className = "", offLabel = "Start the microphone", onLabel = "Stop the mic" }: { on: boolean; onClick: () => void; className?: string; offLabel?: string; onLabel?: string }) {
  return (
    <Button
      size="sm"
      pressed={on}
      onClick={onClick}
      title={on ? "Stop listening" : "Switch the mic on and sing"}
      className={`inline-flex items-center gap-1.5 !border-emerald-400/60 ${on ? "!bg-emerald-500/25 !text-emerald-100" : "!bg-emerald-500/10 !text-emerald-200 hover:!bg-emerald-500/20"} ${className}`}
    >
      <Mic />
      {on ? onLabel : offLabel}
    </Button>
  );
}
