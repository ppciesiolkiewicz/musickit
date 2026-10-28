"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button, Checkbox, Section } from "@/components/ui";
import { catalogue } from "./model/catalogue";
import { DEFAULT_ANSWERS } from "./model/questions";
import { dayIndex, doneKey, localDate, weekOver } from "./model/schedule";
import { PLAN_DAYS, type PlanAnswers, type PlanConfig, type PlanState, type StoredPlan } from "./model/types";
import { askNotifications, notificationsSupported } from "./reminders";
import { usePlan } from "./store/usePlan";
import PlanFlow, { savedFlow } from "./ui/PlanFlow";
import WeekView from "./ui/WeekView";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

/** Start `config` today; the running plan, if any, moves to the history. */
const start = (s: PlanState, config: PlanConfig): PlanState => ({
  ...s,
  current: { id: newId(), config, startedOn: localDate(), done: {} },
  history: s.current ? [s.current, ...s.history].slice(0, 20) : s.history,
});

/**
 * The AI practice plan, a continuous daily plan: Start runs the questions, the prompt for your own AI and the paste in one
 * step modal; a new day opens each day. When the week is done "Plan next week" runs the shorter follow-up, whose prompt
 * carries this week's exercises; "Start anew" runs the first flow again with no past in the prompt.
 */
export default function PlanApp() {
  const { state, loaded, update } = usePlan();
  const entries = useMemo(() => catalogue(), []);
  // a flow left open (reload, hot reload) comes back; the modal only renders after the store loads, so no hydration mismatch
  const [flow, setFlow] = useState<"start" | "next" | null>(() => (typeof window === "undefined" ? null : savedFlow()?.mode ?? null));
  const [today, setToday] = useState(() => localDate());
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(t);
  }, []);

  const plan = state.current;
  const todayIdx = plan ? Math.min(dayIndex(plan.startedOn, today), PLAN_DAYS - 1) : 0;
  const over = plan ? weekOver(plan, today) : false;

  const onPlan = (config: PlanConfig, answers?: PlanAnswers, feedback?: string) => {
    update((s) => start({ ...s, answers: answers ?? s.answers, current: s.current && feedback !== undefined ? { ...s.current, feedback } : s.current }, config));
    setFlow(null);
    setDay(0);
  };
  const setPlan = (change: (p: StoredPlan) => StoredPlan) => update((s) => (s.current ? { ...s, current: change(s.current) } : s));
  const toggle = (d: number, e: number) =>
    setPlan((p) => {
      const done = { ...p.done };
      if (done[doneKey(d, e)]) delete done[doneKey(d, e)];
      else done[doneKey(d, e)] = true;
      return { ...p, done };
    });

  if (!loaded) return <p className="text-sm text-slate-500">Loading…</p>;

  const modal = flow && (
    <PlanFlow mode={flow} answers={state.answers ?? DEFAULT_ANSWERS} current={plan} history={state.history} entries={entries} onPlan={onPlan} onClose={() => setFlow(null)} />
  );
  const primary = "!border-sky-500/70 !bg-sky-500/20 !text-sky-100 hover:!bg-sky-500/30";

  if (!plan) {
    return (
      <div className="flex flex-col gap-4">
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <ol className="grid w-full gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {["Answer a few questions about where you are and where you want to go", "Copy the prompt into your own AI (ChatGPT, Claude, Gemini…)", "Paste its reply: your exercises, a new set each day"].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-500/20 text-xs text-sky-200">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <Button onClick={() => setFlow("start")} className={`${primary} px-5 py-2 text-sm`}><Icon name="sparkles" size={16} />Start</Button>
        </section>
        {state.history.length > 0 && <History plans={state.history} onUse={(c) => onPlan(c)} />}
        {modal}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">{over ? "Week done" : `Day ${todayIdx + 1} of ${PLAN_DAYS}`} · started {plan.startedOn}</p>
          <h2 className="text-xl font-light text-slate-100">{plan.config.title}</h2>
          {plan.config.summary && <p className="mt-1 max-w-3xl text-sm text-slate-400">{plan.config.summary}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Reminder state={state} update={update} />
          <Button size="sm" onClick={() => setFlow("next")} title="Plan the next days from this week's exercises"><Icon name="sparkles" size={12} />Plan next week</Button>
          <Button size="sm" onClick={() => setFlow("start")} title="Answer the questions again; the prompt leaves out past weeks"><Icon name="rotate-ccw" size={12} />Start anew</Button>
        </div>
      </div>

      {over && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-l-4 border-slate-700 border-l-sky-400 bg-slate-900/80 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base text-slate-100">Ready for next week</h2>
            <p className="text-sm text-slate-400">Tell us how it went; the next prompt builds on what you did and skipped.</p>
          </div>
          <Button onClick={() => setFlow("next")} className={primary}><Icon name="sparkles" size={14} />Plan next week</Button>
        </section>
      )}

      <WeekView plan={plan} today={over ? PLAN_DAYS - 1 : todayIdx} day={day ?? todayIdx} onDay={setDay} onToggle={toggle} />

      {state.history.length > 0 && <History plans={state.history} onUse={(c) => onPlan(c)} />}
      {modal}
    </div>
  );
}

/** Earlier weeks: what each was and how much got done; any can be started again. */
function History({ plans, onUse }: { plans: StoredPlan[]; onUse: (c: PlanConfig) => void }) {
  return (
    <Section title="Earlier plans" meta={`${plans.length}`} defaultOpen={false}>
      <ul className="flex flex-col gap-2">
        {plans.map((p) => {
          const total = p.config.days.reduce((n, d) => n + d.exercises.length, 0);
          const done = Object.keys(p.done).length;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm text-slate-200">{p.config.title}</span>
              <span className="text-xs text-slate-500">started {p.startedOn} · {done}/{total} done</span>
              <Button size="sm" onClick={() => onUse(p.config)}><Icon name="rotate-ccw" size={12} />Start again</Button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Daily reminder: a time and a switch. Switching on asks the browser for notifications. */
function Reminder({ state, update }: { state: PlanState; update: (c: (s: PlanState) => PlanState) => void }) {
  const [denied, setDenied] = useState(false);
  // only rendered once the plan has loaded (after mount), so reading the browser here can't mismatch the server render
  if (!notificationsSupported()) return null;
  const r = state.reminder;
  const set = (enabled: boolean) => update((s) => ({ ...s, reminder: { ...s.reminder, enabled } }));
  const flip = async (on: boolean) => {
    if (!on) return set(false);
    const ok = await askNotifications();
    setDenied(!ok);
    set(ok);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 px-2.5 py-1">
      <Icon name={r.enabled ? "bell" : "bell-off"} size={14} className={r.enabled ? "text-sky-300" : "text-slate-500"} />
      <Checkbox checked={r.enabled} onChange={flip} title="A browser notification once a day while attunr is open in a tab">Remind me at</Checkbox>
      <input
        type="time"
        value={r.time}
        onChange={(e) => e.target.value && update((s) => ({ ...s, reminder: { ...s.reminder, time: e.target.value, lastShownOn: undefined } }))}
        className="rounded border border-slate-700 bg-slate-950/60 px-1 py-0.5 text-xs text-slate-200"
        aria-label="Reminder time"
      />
      {denied && <span className="text-[11px] text-rose-300">Blocked: allow notifications in the browser settings</span>}
    </div>
  );
}
