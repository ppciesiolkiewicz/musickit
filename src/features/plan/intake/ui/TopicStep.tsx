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
 * One area's topics. Answered topics fold into small cards in a grid at the top, four to a row on a wide screen, each
 * with the topic's name and its picked line; a press on a card opens that topic again. Below them, one row per topic
 * still without an answer, and the open topic shows its description and its four lines in one column, easiest first.
 * A pick shows its tick a moment, then the topic folds into its card and the next topic without an answer opens (none
 * left: only the cards are left, the summary of the answers). A press on a row's head opens or closes it. A press on
 * the picked line clears it. Any topic may be left without an answer.
 * Lines, cards and level meters are coloured by level, red for "Not yet" to green for the most able.
 */
export default function TopicStep({ area, topics, onTopics }: { area: Area; topics: PlanAnswers["topics"]; onTopics: (t: PlanAnswers["topics"]) => void }) {
  const list = topicsFor(area);
  const [openId, setOpenId] = useState<string | null>(() => list.find((t) => topics[t.id] === undefined)?.id ?? null);
  // the pick's tick shows this long before its topic folds into a card
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
    const at = list.findIndex((t) => t.id === id);
    const after = [...list.slice(at + 1), ...list.slice(0, at)].find((t) => next[t.id] === undefined);
    wait.current = setTimeout(() => setOpenId(after?.id ?? null), 250);
  };

  const folded = list.filter((t) => topics[t.id] !== undefined && t.id !== openId);
  const rowsLeft = list.filter((t) => topics[t.id] === undefined || t.id === openId);

  return (
    <div className="flex flex-col gap-3">
      {folded.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5 desk:grid-cols-4">
          {folded.map((t) => {
            const rung = topics[t.id] as Rung;
            const tone = HUE_TONES[RUNG_HUE[rung]];
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  title={t.lines[rung]}
                  className={`flex h-16 w-full cursor-pointer flex-col items-start gap-1 rounded-lg border px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(RUNG_HUE[rung], true)}`}
                >
                  <span className="flex w-full items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-100">{t.label}</span>
                    <Meter rung={rung} fill={tone.fill} />
                  </span>
                  <span className={`line-clamp-2 text-[11px] leading-tight ${tone.ink}`}>{t.lines[rung]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {rowsLeft.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rowsLeft.map((t) => {
            const rung = topics[t.id];
            const open = t.id === openId;
            return (
              <li key={t.id} ref={(el) => { rows.current[t.id] = el; }} className={`rounded-xl border transition-colors ${open ? "border-sky-400/50 bg-slate-900/80" : "border-slate-800 bg-slate-900/40"}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`topic-${t.id}-lines`}
                  onClick={() => toggle(t.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  <span id={`topic-${t.id}`} className="min-w-0 flex-1 text-sm font-medium text-slate-100">{t.label}</span>
                  {!open && <span className="text-xs text-slate-500">No answer yet</span>}
                  <Icon name="chevron-down" size={14} className={`shrink-0 text-slate-500 ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
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
                          className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(RUNG_HUE[r], rung === r)}`}
                        >
                          <Meter rung={r} fill={HUE_TONES[RUNG_HUE[r]].fill} />
                          <span className="flex-1">{t.lines[r]}</span>
                          {rung === r && <Icon name="check" size={16} className={`shrink-0 ${HUE_TONES[RUNG_HUE[r]].ink}`} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
