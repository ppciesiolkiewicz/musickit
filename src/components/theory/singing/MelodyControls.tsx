"use client";

import { useEffect, useState } from "react";
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

/** Copies a link to the tune (in the key and scale shown) and shows a tick for a moment once it is copied. */
export function ShareButton({ link }: { link: () => string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => void navigator.clipboard?.writeText(link()).then(() => setCopied(true)).catch(() => undefined);
  return (
    <Button size="sm" onClick={copy} title={copied ? "Link copied" : "Copy a link to this melody"} aria-label={copied ? "Link copied" : "Copy a link to this melody"} className={`!px-2 ${copied ? "!border-emerald-400/60 !text-emerald-200" : ""}`}>
      <span className="grid h-4 w-4 place-items-center"><Icon name={copied ? "check" : "share-2"} size={14} /></span>
    </Button>
  );
}

/** The metronome heard or muted (it keeps time either way), styled as the settings' mute: a speaker, crossed and amber while muted. */
export function ClickButton({ heard, onHear }: { heard: boolean; onHear: (on: boolean) => void }) {
  return (
    <Button
      size="sm"
      onClick={() => onHear(!heard)}
      title={heard ? "Mute the metronome (it keeps time)" : "Unmute the metronome"}
      aria-label={heard ? "Mute the metronome" : "Unmute the metronome"}
      className={`!px-2 ${heard ? "" : "!border-amber-400/60 !text-amber-200"}`}
    >
      <span className="flex h-4 items-center gap-0.5">
        <Icon name="metronome" size={14} />
        <Icon name={heard ? "volume-2" : "volume-x"} size={14} />
      </span>
    </Button>
  );
}
