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
 * One area's topics as one list, each row a topic with its picked line. The open row shows the topic's description and
 * its four lines in one column, easiest first. A pick shows its tick a moment, then the row closes to its answer and the
 * next topic without an answer opens (none left: every row is closed, and the list is the summary of the answers).
 * A press on a row's head opens or closes it, so changing an answer is a press and a pick. A press on the picked line
 * clears it. Any topic may be left without an answer.
 * Lines, answers and level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);
  const [openId, setOpenId] = useState<string | null>(() => list.find((t) => topics[t.id] === undefined)?.id ?? null);
  // the pick's tick shows this long before its row closes
  const wait = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(wait.current), []);
  const rows = useRef<Record<string, HTMLLIElement | null>>({});
  // a row that opens below the fold of the scrolling step is brought into view once it has opened
  useEffect(() => {
    if (!openId) return;
    const t = setTimeout(() => rows.current[openId]?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 320);
    return () => clearTimeout(t);
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
    const at = list.findIndex((t) => t.id === id);
    const after = [...list.slice(at + 1), ...list.slice(0, at)].find((t) => next[t.id] === undefined);
    wait.current = setTimeout(() => setOpenId(after?.id ?? null), 350);
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
              <span aria-hidden className={`w-1 self-stretch rounded-full transition-colors ${tone ? tone.fill : "bg-slate-700"}`} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={`topic-${t.id}`} className="text-sm font-medium text-slate-100">{t.label}</span>
                <span className={`text-sm leading-snug ${tone ? tone.ink : "text-slate-500"}`}>{rung !== undefined ? t.lines[rung] : "No answer yet"}</span>
              </span>
              <Meter rung={rung} fill={tone?.fill} />
              <Icon name="chevron-down" size={14} className={`shrink-0 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>
            {/* opens and closes by its rows (0fr to 1fr), so the rows below slide instead of jumping */}
            <div inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 overflow-hidden">
                <div id={`topic-${t.id}-lines`} className="px-3 pb-3">
                  <p className="mb-2 text-sm text-slate-400">{t.desc}</p>
                  <div role="radiogroup" aria-labelledby={`topic-${t.id}`} className="flex flex-col gap-1.5">
                    {RUNGS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={rung === r}
                        onClick={() => pick(t.id, r)}
                        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(RUNG_HUE[r], rung === r)}`}
                      >
                        <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
                        <span className="flex-1">{t.lines[r]}</span>
                        {rung === r && <Icon name="check" size={16} className={`shrink-0 ${HUE_TONES[RUNG_HUE[r]].ink}`} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
