"use client";

import { InfoTip } from "@/components/ui";
import type { PlanAnswers } from "../../intake/answers";
import type { ConceptOutcome, ConceptState, Outcome, TopicOutcome } from "../../model/outcome";
import { LEVELS, labelOf } from "../../model/questions";
import { minutesOf, shownAreas, topicLevel } from "../../model/trackerView";

const STATE_WORDS: Record<ConceptState, string> = { solid: "Solid", working: "Working on", "not-yet": "Not yet" };
const STATE_TONES: Record<ConceptState, string> = {
  solid: "border-emerald-500/50 text-emerald-200",
  working: "border-sky-500/50 text-sky-200",
  "not-yet": "border-slate-700 text-slate-500",
};

/** A local `yyyy-mm-dd` as "12 Nov". */
const shortDate = (day: string): string => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** "Beginner", or "Beginner, starting on Intermediate" once something at the next level is solid. */
function levelLine(t: TopicOutcome): string {
  const at = topicLevel(t);
  if (!at) return "Not answered or practised yet";
  const level = labelOf(LEVELS, at.level);
  return at.next ? `${level}, starting on ${labelOf(LEVELS, at.next)}` : level;
}

/** How often a concept was rated, when last, and the minutes practised; nothing for one not rated yet. */
function details(c: ConceptOutcome): string[] {
  if (c.state === "not-yet") return [];
  const times = c.ratings === 1 ? "once" : `${c.ratings} times`;
  const lines = [c.lastOn ? `Rated ${times}, last on ${shortDate(c.lastOn)}.` : `Rated ${times}.`];
  const minutes = minutesOf(c.seconds);
  if (minutes > 0) lines.push(`${minutes} min practised.`);
  return lines;
}

function Concept({ c }: { c: ConceptOutcome }) {
  const lines = details(c);
  return (
    <li className="flex items-center gap-2 py-1">
      <span className="min-w-0 flex-1 text-sm text-slate-300">{c.label}</span>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATE_TONES[c.state]}`}>{STATE_WORDS[c.state]}</span>
      {/* a fixed slot, so the state words line up whether or not a concept has details */}
      <span className="flex w-6 shrink-0 justify-center">
        {lines.length > 0 && (
          <InfoTip hover label={`Details for ${c.label}`}>
            {lines.map((l) => <p key={l}>{l}</p>)}
          </InfoTip>
        )}
      </span>
    </li>
  );
}

/**
 * The progress tracker's body: each area the student chose or practised, its six topics with the level each stands on,
 * and every concept with how it went. Levels by name and plain facts only: no score, no percentage.
 */
export default function ProgressTracker({ outcome, answers }: { outcome: Outcome; answers: PlanAnswers | null }) {
  const areas = shownAreas(outcome, answers);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-400">The level you&apos;re at in each topic, from your answers and your ratings. A concept is solid when its latest exercise got 4 or 5 stars.</p>
      {areas.length === 0 && <p className="text-sm text-slate-400">No areas yet. Rate an exercise in your plan and its area shows here.</p>}
      {areas.map((a) => (
        <section key={a.area} className="flex flex-col gap-3">
          <h3 className="metal-text text-xs font-medium uppercase tracking-wider text-slate-400">{a.label}</h3>
          <ul className="flex flex-col gap-3">
            {a.topics.map((t) => (
              <li key={t.topic} className="rounded-xl border border-slate-800 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="text-sm font-medium text-slate-100">{t.label}</h4>
                  <span className={`text-xs ${topicLevel(t) ? "text-amber-200/90" : "text-slate-500"}`}>{levelLine(t)}</span>
                </div>
                {t.concepts.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-800/70">
                    {t.concepts.map((c) => <Concept key={c.id} c={c} />)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
