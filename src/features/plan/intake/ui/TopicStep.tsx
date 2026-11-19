"use client";

import { useEffect, useRef, useState } from "react";
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
 * One area's topics as one list. The open topic shows its description and its four lines in one column, easiest first.
 * A closed topic, answered or not, shows the same four lines small, side by side in one row of fixed height, the
 * picked one coloured, so closing a topic never changes how much room it takes; a press on a small line picks it
 * without opening the topic. A pick shows its tick a moment, then the next topic without an answer opens (none left:
 * every topic is closed, and the list is the summary of the answers). A press on a topic's head opens or closes it.
 * A press on the picked line clears it. Any topic may be left without an answer.
 * Lines and level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);
  const [openId, setOpenId] = useState<string | null>(() => list.find((t) => topics[t.id] === undefined)?.id ?? null);
  // the pick's tick shows this long before the next topic opens
  const wait = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(wait.current), []);
  const rows = useRef<Record<string, HTMLLIElement | null>>({});
  // a topic that opens below the fold of the scrolling step is brought into view
  useEffect(() => {
    if (openId) rows.current[openId]?.scrollIntoView({ block: "nearest" });
  }, [openId]);

  const toggle = (id: string) => {
    clearTimeout(wait.current);
    setOpenId((o) => (o === id ? null : id));
  };

  const pick = (id: string, rung: Rung) => {
    clearTimeout(wait.current);
    const next = { ...topics };
    if (next[id] === rung) {
      delete next[id];
      onTopics(next);
      return;
    }
    next[id] = rung;
    onTopics(next);
    if (openId !== id) return;
    const at = list.findIndex((t) => t.id === id);
    const after = [...list.slice(at + 1), ...list.slice(0, at)].find((t) => next[t.id] === undefined);
    wait.current = setTimeout(() => setOpenId(after?.id ?? null), 250);
  };

  return (
    <ul className="flex flex-col gap-2">
      {list.map((t) => {
        const rung = topics[t.id];
        const tone = rung !== undefined ? HUE_TONES[RUNG_HUE[rung]] : undefined;
        const open = t.id === openId;
        return (
          <li key={t.id} ref={(el) => { rows.current[t.id] = el; }} className={`rounded-xl border transition-colors ${open ? "border-sky-400/50 bg-slate-900/80" : "border-slate-800 bg-slate-900/40"}`}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`topic-${t.id}-lines`}
              onClick={() => toggle(t.id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl py-2.5 pl-2.5 pr-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full transition-colors ${tone ? tone.fill : "bg-slate-700"}`} />
              <span id={`topic-${t.id}`} className="min-w-0 flex-1 text-sm font-medium text-slate-100">{t.label}</span>
              <Icon name="chevron-down" size={14} className={`shrink-0 text-slate-500 ${open ? "rotate-180" : ""}`} />
            </button>
            <div id={`topic-${t.id}-lines`} className="px-2.5 pb-2.5">
              {open && <p className="mb-2 text-sm text-slate-400">{t.desc}</p>}
              <div role="radiogroup" aria-labelledby={`topic-${t.id}`} className={open ? "flex flex-col gap-1.5" : "grid grid-cols-4 gap-1"}>
                {RUNGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rung === r}
                    title={open ? undefined : t.lines[r]}
                    onClick={() => pick(t.id, r)}
                    className={`flex cursor-pointer rounded-lg border text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      open ? "min-h-14 items-center gap-3 px-3 py-2 text-sm leading-tight" : "h-14 flex-col items-start gap-1 px-1.5 py-1 text-[11px] leading-tight desk:h-11 desk:flex-row desk:gap-1.5"
                    } ${hueClass(RUNG_HUE[r], rung === r)}`}
                  >
                    <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
                    <span className={open ? "flex-1" : "line-clamp-2 min-w-0 desk:flex-1"}>{t.lines[r]}</span>
                    {open && rung === r && <Icon name="check" size={16} className={`shrink-0 ${HUE_TONES[RUNG_HUE[r]].ink}`} />}
                  </button>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
