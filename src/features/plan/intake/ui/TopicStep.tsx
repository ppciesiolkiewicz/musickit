"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { HUE_TONES, hueClass, type Hue } from "@/components/ui";
import type { Area } from "../../model/concepts";
import type { PlanAnswers } from "../answers";
import { topicsFor, type Rung } from "../topics";

const RUNGS: Rung[] = [0, 1, 2, 3];

/** Each line's colour by how far along it is: red for "Not yet" up to green for the most able. */
const RUNG_HUE: Record<Rung, Hue> = { 0: "red", 1: "amber", 2: "teal", 3: "emerald" };

/** How far along a line is, as four bars: one lit for "Not yet", all four for the most able line. */
function Meter({ rung, fill }: { rung: Rung; fill: string }) {
  return (
    <span aria-hidden className="flex shrink-0 items-end gap-0.5">
      {[0, 1, 2, 3].map((n) => <span key={n} className={`w-1 rounded-sm ${n <= rung ? fill : "bg-slate-700"}`} style={{ height: 5 + n * 3 }} />)}
    </span>
  );
}

/**
 * One area's topics as a list where one row is open at a time; a tap on a closed row opens it, the open row stays open. The open row shows the topic's four lines; a tap on a line
 * picks it, closes the row and opens the next topic without an answer. A tap on the picked line again clears it.
 * A closed row with an answer shows the picked line under the topic's name. Any topic may be left without an answer.
 * Lines and their level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);
  const [open, setOpen] = useState<string | null>(() => list.find((t) => topics[t.id] === undefined)?.id ?? null);

  const pick = (id: string, rung: Rung) => {
    const next = { ...topics };
    if (next[id] === rung) {
      delete next[id];
      onTopics(next);
      return;
    }
    next[id] = rung;
    onTopics(next);
    const i = list.findIndex((t) => t.id === id);
    const rest = [...list.slice(i + 1), ...list.slice(0, i)];
    setOpen(rest.find((t) => next[t.id] === undefined)?.id ?? null);
  };

  return (
    <ul className="flex flex-col gap-2">
      {list.map((t) => {
        const rung = topics[t.id];
        const isOpen = open === t.id;
        return (
          <li key={t.id} className={`rounded-xl border transition-colors ${isOpen ? "border-sky-400/60 bg-slate-900/80" : rung !== undefined ? "border-slate-800 bg-slate-900/40" : "border-slate-800 bg-slate-900/60"}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(t.id)}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${isOpen ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-medium text-slate-100">{t.label}</span>
                <span className={`text-sm ${rung !== undefined && !isOpen ? HUE_TONES[RUNG_HUE[rung]].ink : "text-slate-400"}`}>{rung !== undefined && !isOpen ? t.lines[rung] : t.desc}</span>
              </span>
              {rung !== undefined ? (
                <span className="flex shrink-0 items-center gap-2">
                  <Meter rung={rung} fill={HUE_TONES[RUNG_HUE[rung]].fill} />
                  <Icon name="check" size={16} className={HUE_TONES[RUNG_HUE[rung]].ink} />
                </span>
              ) : (
                !isOpen && <Icon name="chevron-down" size={14} className="shrink-0 text-slate-500" />
              )}
            </button>
            {isOpen && (
              <div className="grid gap-1.5 px-4 pb-4 desk:grid-cols-2">
                {RUNGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={rung === r}
                    onClick={() => pick(t.id, r)}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(RUNG_HUE[r], rung === r)}`}
                  >
                    <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
                    <span className="flex-1">{t.lines[r]}</span>
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
