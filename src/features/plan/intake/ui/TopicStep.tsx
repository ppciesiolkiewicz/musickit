"use client";

import { HUE_TONES, hueClass, type Hue } from "@/components/ui";
import type { Area } from "../../model/concepts";
import type { PlanAnswers } from "../answers";
import { topicsFor, type Rung } from "../topics";

const RUNGS: Rung[] = [0, 1, 2, 3];

/** Each line's colour by how far along it is: red for "Not yet" up to green for the most able. */
const RUNG_HUE: Record<Rung, Hue> = { 0: "red", 1: "amber", 2: "teal", 3: "emerald" };

/** How far along a line is, as four bars: one lit for "Not yet", all four for the most able line. */
function Meter({ rung, fill }: { rung: Rung | undefined; fill?: string }) {
  return (
    <span aria-hidden className="flex shrink-0 items-end gap-0.5">
      {[0, 1, 2, 3].map((n) => <span key={n} className={`w-1 rounded-sm ${rung !== undefined && n <= rung ? fill : "bg-slate-700"}`} style={{ height: 5 + n * 3 }} />)}
    </span>
  );
}

/**
 * One area's topics as one list. Every topic shows its four lines at once, side by side in one row, easiest first,
 * so nothing opens, closes or moves: a pick only colours its line, and the list is the summary of the answers.
 * A press on the picked line clears it. Any topic may be left without an answer.
 * Lines and level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);

  const pick = (id: string, rung: Rung) => {
    const next = { ...topics };
    if (next[id] === rung) delete next[id];
    else next[id] = rung;
    onTopics(next);
  };

  return (
    <ul className="flex flex-col gap-3">
      {list.map((t) => {
        const rung = topics[t.id];
        const tone = rung !== undefined ? HUE_TONES[RUNG_HUE[rung]] : undefined;
        return (
          <li key={t.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span aria-hidden className={`h-2 w-2 shrink-0 self-center rounded-full ${tone ? tone.fill : "bg-slate-700"}`} />
              <span id={`topic-${t.id}`} className="shrink-0 text-sm font-medium text-slate-100">{t.label}</span>
              <span className="min-w-0 truncate text-xs text-slate-500">{t.desc}</span>
            </div>
            <div role="radiogroup" aria-labelledby={`topic-${t.id}`} className="grid grid-cols-4 gap-1">
              {RUNGS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={rung === r}
                  onClick={() => pick(t.id, r)}
                  className={`flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-1.5 text-left text-[11px] leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 desk:text-xs ${hueClass(RUNG_HUE[r], rung === r)}`}
                >
                  <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
                  <span>{t.lines[r]}</span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
