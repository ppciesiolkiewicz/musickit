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
function Meter({ rung, fill }: { rung: Rung | undefined; fill?: string }) {
  return (
    <span aria-hidden className="flex shrink-0 items-end gap-0.5">
      {[0, 1, 2, 3].map((n) => <span key={n} className={`w-1 rounded-sm ${rung !== undefined && n <= rung ? fill : "bg-slate-700"}`} style={{ height: 5 + n * 3 }} />)}
    </span>
  );
}

/**
 * One area's topics, one at a time. The current topic sits in a panel at the top with its four lines below it, in one
 * column, easiest first. Every part of the panel has a fixed height, so the four lines stay in the same place from topic
 * to topic: a player who knows their level taps down the same spot without moving the pointer.
 * A tap on a line picks it and brings up the next topic without an answer (the panel stays on the last one when all are
 * answered). A tap on the picked line again clears it. Under the panel, every topic of the area with its picked line;
 * a tap brings that topic back into the panel. Any topic may be left without an answer.
 * Lines and their level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);
  const [currentId, setCurrentId] = useState<string>(() => (list.find((t) => topics[t.id] === undefined) ?? list[0]).id);
  const index = Math.max(0, list.findIndex((t) => t.id === currentId));
  const current = list[index];
  const picked = topics[current.id];

  const pick = (rung: Rung) => {
    const next = { ...topics };
    if (next[current.id] === rung) {
      delete next[current.id];
      onTopics(next);
      return;
    }
    next[current.id] = rung;
    onTopics(next);
    const rest = [...list.slice(index + 1), ...list.slice(0, index)];
    const after = rest.find((t) => next[t.id] === undefined);
    if (after) setCurrentId(after.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby={`topic-${current.id}`} className="rounded-xl border border-sky-400/50 bg-slate-900/80 p-4">
        {/* fixed height, so a long description never pushes the lines down */}
        <div key={current.id} className="landing-fade h-[5rem]">
          <p className="text-xs tabular-nums text-slate-500">Topic {index + 1} of {list.length}</p>
          <h4 id={`topic-${current.id}`} className="text-[15px] font-medium text-slate-100">{current.label}</h4>
          <p className="line-clamp-2 text-sm text-slate-400">{current.desc}</p>
        </div>
        <div role="radiogroup" aria-labelledby={`topic-${current.id}`} className="mt-3 flex flex-col gap-1.5">
          {RUNGS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={picked === r}
              onClick={() => pick(r)}
              className={`flex h-16 cursor-pointer items-center gap-3 rounded-lg border px-3 text-left text-sm leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(RUNG_HUE[r], picked === r)}`}
            >
              <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
              <span key={current.id} className="landing-fade line-clamp-3 flex-1">{current.lines[r]}</span>
              {picked === r && <Icon name="check" size={16} className={`shrink-0 ${HUE_TONES[RUNG_HUE[r]].ink}`} />}
            </button>
          ))}
        </div>
      </section>

      <ul className="grid gap-1.5 desk:grid-cols-2">
        {list.map((t) => {
          const rung = topics[t.id];
          const on = t.id === current.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => setCurrentId(t.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-400/60 bg-sky-500/10" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-slate-100">{t.label}</span>
                  <span className={`truncate text-xs ${rung !== undefined ? HUE_TONES[RUNG_HUE[rung]].ink : "text-slate-500"}`}>{rung !== undefined ? t.lines[rung] : "No answer yet"}</span>
                </span>
                <Meter rung={rung} fill={rung !== undefined ? HUE_TONES[RUNG_HUE[rung]].fill : undefined} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
