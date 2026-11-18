"use client";

import Icon from "@/components/Icon";
import { HUE_TONES, Slider, type Hue } from "@/components/ui";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { AREA_LOOK } from "@/features/plan/intake/ui/Questionnaire";
import { LEVEL_MARKS, STEP, levelWord } from "../model/sliders";
import type { TopicSlider } from "../model/types";

/**
 * Where a score sits along the slider, as a CSS `left`: the `Slider` atom (Radix, size md) keeps its 1rem thumb inside the
 * track, so the thumb's centre runs from half a thumb in from one end to half a thumb in from the other; the marks follow it.
 */
const along = (score: number): string => `calc(0.5rem + (100% - 1rem) * ${score / 3})`;

/** One topic: its name, the slider (0 to 3, a tenth at a time) with the start-of-week mark, the four levels under it, the value in words. */
function TopicRow({ t, value, hue, onChange, disabled }: { t: TopicSlider; value: number; hue: Hue; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <li className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-slate-800 py-3 first:border-t-0 sm:grid-cols-[9rem_1fr_11rem] sm:items-start">
      <p className="text-sm font-medium text-slate-200">{t.label}</p>
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Slider aria-label={t.label} value={value} onChange={onChange} min={0} max={3} step={STEP} hue={hue} disabled={disabled} />
          {t.atStart !== null && (
            <span
              aria-hidden
              title={`At the start of this week: ${levelWord(t.atStart)}`}
              className="pointer-events-none absolute -top-1 h-7 w-0.5 -translate-x-1/2 rounded-full bg-slate-300/80"
              style={{ left: along(t.atStart) }}
            />
          )}
        </div>
        <div aria-hidden className="relative h-4 text-[10px] text-slate-500 sm:text-[11px]">
          {LEVEL_MARKS.map((w, i) => (
            <span key={w} className={`absolute top-0 whitespace-nowrap ${i === 0 ? "" : i === 3 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: i === 0 ? 0 : i === 3 ? "100%" : along(i) }}>{w}</span>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-300">
        <span aria-live="polite">{levelWord(value)}</span>
        {t.atStart !== null && <span className="sr-only">. At the start of this week: {levelWord(t.atStart)}</span>}
      </p>
    </li>
  );
}

/**
 * A slider per topic of the student's areas, grouped by area with the area's colour and icon (`AREA_LOOK`), as on the
 * questionnaire. Each opens where `values` has it; a mark shows the score at the start of the current week (none
 * without a week). The `Slider` atom carries the topic's name (`aria-label`); the value in words beside it is read out as it changes.
 */
export default function TopicSliders({ topics, values, onChange, disabled = false }: {
  topics: TopicSlider[];
  values: Record<string, number>;
  onChange: (topic: string, value: number) => void;
  disabled?: boolean;
}) {
  const areas = AREAS.filter((a) => topics.some((t) => t.area === a.id));
  return (
    <div className="flex flex-col gap-4">
      {areas.map((a) => <AreaGroup key={a.id} area={a.id} label={a.label} topics={topics.filter((t) => t.area === a.id)} values={values} onChange={onChange} disabled={disabled} />)}
    </div>
  );
}

function AreaGroup({ area, label, topics, values, onChange, disabled }: { area: Area; label: string; topics: TopicSlider[]; values: Record<string, number>; onChange: (topic: string, value: number) => void; disabled: boolean }) {
  const { hue, icon } = AREA_LOOK[area];
  return (
    <section aria-label={label} className="metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <h4 className={`flex items-center gap-2 text-sm font-semibold ${HUE_TONES[hue].ink}`}>
        <span className={`grid size-7 place-items-center rounded-full ${HUE_TONES[hue].disc[0]}`}><Icon name={icon} size={14} /></span>
        {label}
      </h4>
      <ul className="mt-1">
        {topics.map((t) => <TopicRow key={t.topic} t={t} value={values[t.topic] ?? t.now} hue={hue} onChange={(v) => onChange(t.topic, v)} disabled={disabled} />)}
      </ul>
    </section>
  );
}
