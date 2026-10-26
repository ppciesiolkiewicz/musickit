"use client";

import Icon from "@/components/Icon";
import { Button } from "@/components/ui";

/** Back to the start of the tune: the bar and the metronome over on beat 1, nothing played. */
export function RestartButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick} title="Back to the start (the metronome starts over, nothing plays)" aria-label="Back to the start" className="!px-2">
      <span className="grid h-4 w-4 place-items-center"><Icon name="rotate-ccw" size={14} /></span>
    </Button>
  );
}

/** The metronome heard or muted (it keeps time either way): a metronome while heard, a crossed speaker beside it while muted. */
export function ClickButton({ heard, onHear }: { heard: boolean; onHear: (on: boolean) => void }) {
  return (
    <Button
      size="sm"
      pressed={heard}
      onClick={() => onHear(!heard)}
      title={heard ? "Mute the metronome (it keeps time)" : "Hear the metronome"}
      aria-label={heard ? "Mute the metronome" : "Hear the metronome"}
      className={`!px-2 ${heard ? "!border-amber-400/60 !bg-amber-500/15 !text-amber-100" : ""}`}
    >
      <span className="flex h-4 items-center gap-0.5">
        <Icon name="metronome" size={14} />
        {!heard && <Icon name="volume-x" size={12} />}
      </span>
    </Button>
  );
}
