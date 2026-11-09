"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { Area } from "../../model/concepts";
import type { PlanAnswers } from "../answers";
import { topicsFor, type Rung } from "../topics";

const RUNGS: Rung[] = [0, 1, 2, 3];

/**
 * One area's topics as a list where one row is open at a time. The open row shows the topic's four lines; a tap on a line
 * picks it, closes the row and opens the next topic without an answer. A tap on the picked line again clears it.
 * A closed row with an answer shows the picked line under the topic's name. Any topic may be left without an answer.
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
          <li key={t.id} className={`rounded-xl border bg-slate-900/60 ${isOpen ? "border-sky-400/70" : "border-slate-800"}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : t.id)}
              className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-100">{t.label}</span>
                <span className={`text-xs ${rung !== undefined && !isOpen ? "text-sky-300" : "text-slate-400"}`}>{rung !== undefined && !isOpen ? t.lines[rung] : t.desc}</span>
              </span>
              {rung !== undefined && <Icon name="check" size={16} className="shrink-0 text-sky-300" />}
            </button>
            {isOpen && (
              <div className="flex flex-col gap-1.5 px-3.5 pb-3.5">
                {RUNGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={rung === r}
                    onClick={() => pick(t.id, r)}
                    className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      rung === r ? "border-sky-400 bg-sky-500/20 text-sky-50" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span aria-hidden className={`size-4 shrink-0 rounded-full border-2 ${rung === r ? "border-sky-400 bg-sky-400" : "border-slate-500"}`} />
                    {t.lines[r]}
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
