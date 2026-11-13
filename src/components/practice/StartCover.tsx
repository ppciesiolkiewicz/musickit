"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { KeyCap } from "@/components/ui";

/**
 * A start screen laid over an exercise's picture until its first Start: a short heading, a line on what happens, one big
 * Start and a quiet note under it. The picture stays drawn, faded behind, so nothing moves when the cover lifts.
 * The host decides when it shows (usually: nothing asked yet) and what Start does (usually everything at once).
 */
export function StartCover({ show, title, children, onStart, label = "Start", keyCap, note }: {
  show: boolean;
  title: string;
  /** what happens after Start, in a sentence or two */
  children: ReactNode;
  onStart: () => void;
  label?: string;
  /** the key that presses Start too, shown as a key cap on wide screens */
  keyCap?: string;
  /** a quiet line under the button, e.g. that the mic starts with it */
  note?: ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-50">{title}</p>
        <div className="text-sm text-slate-300">{children}</div>
        <button type="button" onClick={onStart}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-300/70 bg-sky-500/30 px-6 py-2.5 text-base font-semibold text-sky-50 shadow-lg shadow-sky-500/20 transition hover:bg-sky-500/45 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
          <Icon name="play" size={16} />{label}{keyCap && <KeyCap className="hidden md:inline">{keyCap}</KeyCap>}
        </button>
        {note && <p className="text-xs text-slate-400">{note}</p>}
      </div>
    </div>
  );
}
