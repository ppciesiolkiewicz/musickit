"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button, Checkbox, HUE_TONES, Modal } from "@/components/ui";
import { DEFAULT_ANSWERS } from "./intake/answers";
import { randomId } from "./model/exerciseIds";
import { recordAnswers } from "./model/answersHistory";
import { backfill, entryFor } from "./model/progressLog";
import { addedPlan, takeAdded } from "./model/added";
import { useProgress } from "@/features/progress/useProgress";
import { localDate, ratePlan, restartPlan, reviewPlan } from "./model/schedule";
import type { Stars } from "@/features/progress/stars";
import type { PlanAnswers, PlanConfig, PlanState, StoredPlan } from "./model/types";
import { askNotifications, confirmReminder, notificationsSupported } from "./reminders";
import { useAllPlanTimes, usePlan, usePlanStore, usePlanTimes } from "./store/usePlan";
import { outcome } from "./model/outcome";
import { mergeTimes } from "./model/trackerView";
import StreakButton from "./ui/tracker/StreakButton";
import ProgressTracker from "./ui/tracker/ProgressTracker";
import PlanFlow, { savedFlow } from "./ui/PlanFlow";
import DayPlan, { TodayStatus } from "./ui/DayPlan";
import PastDays from "./ui/PastDays";
import { useTodayPlan } from "./ui/useTodayPlan";
import { usePlanAgentTools } from "./ui/useBlockAgentTools";
import Link from "next/link";
import SharePopover, { ShareRefused } from "@/features/teachers/studio/SharePopover";
import { useAccount } from "@/features/account/useAccount";
import { FixedLabelRoot, LabelSelect } from "@/features/theory/useLabelSystem";

const NOT_SAVED = "Your latest change isn't saved yet, so the plan wasn't shared. Wait a moment, then press Share again.";

/**
 * The player's own daily plan. Without answers: the intro and Start, which runs the questions in one step modal. With
 * answers: today's plan, composed on the server the first time the page opens that day (`useTodayPlan`), drawn by
 * `DayPlan`, with Get another plan; while it is made or when it can't be, `TodayStatus` says so where the plan would be.
 * Past days are listed under it, read-only.
 */
export default function PlanApp() {
  const { state, loaded, update } = usePlan();
  const progress = useProgress();
  // ratings given before the log existed: copied into it once, the first time it is found empty
  const filled = useRef(false);
  useEffect(() => {
    if (!loaded || !progress.loaded || filled.current) return;
    filled.current = true;
    if (progress.entries.length) return;
    for (const row of backfill([...(state.current ? [state.current] : []), ...state.history], randomId)) progress.put(row);
  }, [loaded, progress, state]);
  // a flow left open (reload, hot reload) comes back; the modal only renders after the store loads, so no hydration mismatch
  // only the first questionnaire: a daily plan has no week to review (a "next" flow saved before is not reopened here)
  const [flow, setFlow] = useState<"start" | "next" | null>(() => (typeof window === "undefined" ? null : savedFlow()?.mode === "start" ? "start" : null));
  // the streak's day, moving at midnight; today's plan keeps the date the page opened with (`useTodayPlan`)
  const [today, setToday] = useState(() => localDate());
  // Share plan: a teacher makes an invite; anyone else is shown what a teacher account does
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const { can } = useAccount();
  // a plan just claimed from an invite (?added=<id>): read once, then taken out of the address so a reload doesn't show it again
  // (the page renders only after the store loads, so reading the address here makes no hydration mismatch)
  const [addedId, setAddedId] = useState<string | null>(() => (typeof window === "undefined" ? null : takeAdded(window.location.href.slice(window.location.origin.length)).id));
  // taken out once the plan has loaded, not on mount: the page can mount again before then (the data source settling)
  useEffect(() => {
    if (!loaded) return;
    const { id, rest } = takeAdded(window.location.href.slice(window.location.origin.length));
    if (id) window.history.replaceState(window.history.state, "", rest);
  }, [loaded]);
  const store = usePlanStore();
  // the invite is made from the stored plan: the latest change has to land first (a store in this browser has it already)
  const prepareShare = useCallback(async () => {
    if ((await store.flush?.()) === false) throw new ShareRefused(NOT_SAVED);
  }, [store]);

  useEffect(() => {
    const t = setInterval(() => setToday(localDate()), 60_000);
    return () => clearInterval(t);
  }, []);

  // today's own plan, composed on the server when the page has answers and none for today
  const day = useTodayPlan(state, loaded, update, store);
  const plan = day.today;
  // the day timer's seconds, kept apart from the plan
  const { times, loaded: timesLoaded, saveTime } = usePlanTimes(plan?.id ?? null);
  const added = loaded ? addedPlan(state, addedId) : null;
  // the streak and the progress tracker: every plan's timer records with this plan's live ones laid over them, so
  // today's saves count without a reload
  const all = useAllPlanTimes();
  const [tracking, setTracking] = useState(false);
  const { current: running, history } = state;
  const plans = useMemo(() => (running ? [running, ...history] : history), [running, history]);
  const allTimes = useMemo(() => mergeTimes(all.times, times), [all.times, times]);
  const result = useMemo(
    () => outcome({ plans, entries: progress.entries, times: allTimes, answersHistory: state.answersHistory }, today),
    [plans, progress.entries, allTimes, state.answersHistory, today],
  );
  // only once every input has loaded, so the count never shows 0 first; a refused read leaves it out
  const streak = all.loaded && progress.loaded ? <StreakButton streak={result.streak} onOpen={() => setTracking(true)} /> : null;
  const tracker = tracking && (
    <Modal title="Your progress" medium onClose={() => setTracking(false)}>
      <ProgressTracker outcome={result} answers={state.answers} />
    </Modal>
  );

  // a finished flow keeps the answers (with their date when the topic screens were asked); with answers and no plan for
  // today, `useTodayPlan` puts one together, so the player lands on the plan being made
  const onAnswers = (answers: PlanAnswers, feedback: string | undefined, asked: boolean) => {
    const at = new Date().toISOString();
    update((s) => ({ ...(asked ? recordAnswers(s, answers, at) : s), answers, current: s.current && feedback !== undefined ? { ...s.current, feedback } : s.current }));
    setFlow(null);
  };
  // an earlier plan, started again: it keeps the running plan's progress summary (restartPlan)
  const startAgain = (config: PlanConfig) => {
    update((s) => restartPlan(s, config, randomId, localDate()));
    setFlow(null);
  };
  const setPlan = (change: (p: StoredPlan) => StoredPlan) => update((s) => (s.current && s.current.id === plan?.id ? { ...s, current: change(s.current) } : s));
  // the browser AI's block tools, while a plan runs
  // the day the player has open in the day editor: the AI leaves it alone until Done
  const [editingDay, setEditingDay] = useState<number | null>(null);
  usePlanAgentTools(loaded ? plan : null, (next) => setPlan(() => next), editingDay);
  // a rating goes to the plan (what the week view draws) and to the progress log (the lasting record, one row per exercise)
  const rate = (d: number, e: number, stars: Stars | null) => {
    const at = new Date().toISOString();
    setPlan((p) => ratePlan(p, d, e, stars, at));
    const current = plan;
    const id = current?.config.days[d]?.exercises[e]?.id;
    if (!current || !id) return;
    const row = stars === null ? null : entryFor(current, d, e, { stars, at }, randomId);
    if (row) progress.put(row);
    else progress.remove(id);
  };

  if (!loaded || !timesLoaded) return <p className="text-sm text-slate-500">Loading…</p>;

  const modal = flow && (
    <PlanFlow mode={flow} answers={state.answers ?? DEFAULT_ANSWERS} current={plan} review={plan?.review ?? null} onReview={(r) => setPlan((p) => reviewPlan(p, r, new Date().toISOString()))} onAnswers={onAnswers} onClose={() => setFlow(null)} />
  );
  const primary = "!rounded-xl !border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 shadow-md shadow-sky-500/20 transition hover:!bg-sky-400";
  // the header's controls: one height, big enough to hit with a guitar in the other hand
  const big = "h-10 !rounded-xl px-4 text-sm";

  const addedNotice = added && <AddedNotice plan={added} onUse={() => { startAgain(added.config); setAddedId(null); }} onClose={() => setAddedId(null)} />;
  const past = <PastDays history={state.history} />;

  if (!state.answers) {
    return (
      <div className="flex flex-col gap-4">
        {state.history.length > 0 && streak && <div>{streak}</div>}
        {addedNotice}
        <section className="flex flex-col items-start gap-4 metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <ol data-tour="plan-steps" className="grid w-full gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {[
              "Answer a few questions about where you are and where you want to go",
              "attunr puts today's plan together from library exercises that fit your answers",
              "Each day you open this page, attunr makes a new plan, shaped by the stars you give each exercise",
            ].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-500/20 text-xs text-sky-200">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <Button data-tour="plan-start" onClick={() => setFlow("start")} className={`${primary} px-5 py-2 text-sm`}><Icon name="sparkles" size={16} />Start</Button>
        </section>
        {past}
        {modal}
        {tracker}
      </div>
    );
  }

  if (!plan) {
    // never yesterday's plan in today's place: the line while it is made, or why it isn't there
    return (
      <div className="flex flex-col gap-4">
        {streak && <div>{streak}</div>}
        {addedNotice}
        <TodayStatus making={day.making} failed={day.failed} onRetry={day.retry} />
        {past}
        {modal}
        {tracker}
      </div>
    );
  }

  // the exercises set their own keys and always count from the scale's root, so the only setting is how notes are labelled:
  // a small pill floating over the day timer, or on a phone a control in the header row, so the corner stays small
  const labels = <LabelSelect className="rounded-xl border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 shadow-xl shadow-black/40 backdrop-blur max-sm:hidden" />;
  const controls = (<>
    <Reminder state={state} update={update} />
    <LabelSelect className="h-10 rounded-lg border border-slate-700 px-3 sm:hidden" />
    <SharePopover kind="plan" itemId={plan.id} open={shareOpen} onClose={closeShare} prepare={prepareShare} instead={can("sharePlan") ? undefined : <UpgradeToTeacher />}>
      <Button onClick={() => setShareOpen((s) => !s)} aria-expanded={shareOpen} className={`${big} !font-semibold !border-sky-400/70 !text-sky-100 transition hover:!bg-sky-500/15`}><Icon name="share-2" size={16} />Share plan</Button>
    </SharePopover>
  </>);
  return (
    <FixedLabelRoot value="scale">
      {/* necks keep the page's margins rather than bleeding to the window's edge */}
      <div className="flex flex-col gap-4 pb-28 [&_.bleed]:mx-0">
        <DayPlan
          plan={plan}
          streak={streak}
          controls={controls}
          onAnother={day.another}
          asking={day.asking}
          none={day.none}
          anotherFailed={day.anotherFailed}
          onRate={rate}
          times={times}
          onTime={saveTime}
          onEdit={(next) => setPlan(() => next)}
          onEditing={setEditingDay}
          corner={labels}
        />
        {addedNotice}
        {past}
        <div className="flex justify-center">
          <Button size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Scroll back to the top of the page">
            <Icon name="arrow-up" size={12} />Back to top
          </Button>
        </div>
        {modal}
        {tracker}
      </div>
    </FixedLabelRoot>
  );
}

/** Share plan for a player without a teacher account: what one does, and the teacher offer. */
function UpgradeToTeacher() {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-slate-300">With a teacher account, you share a plan as a link, and each student who opens it gets their own copy to practise.</p>
      <Link href="/kickstarter" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/20 transition hover:bg-sky-400">
        Upgrade to Teacher account
      </Link>
    </div>
  );
}

/** A plan claimed from an invite went to the earlier plans, as the player had a plan running: says so, with Start again. */
function AddedNotice({ plan, onUse, onClose }: { plan: StoredPlan; onUse: () => void; onClose: () => void }) {
  return (
    <section role="status" className="flex flex-wrap items-start gap-3 rounded-2xl border border-l-4 border-slate-700 border-l-sky-400 bg-slate-900/80 p-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-base text-slate-100">Added to your earlier plans: {plan.config.title}</h2>
        <p className="text-sm text-slate-400">Your current plan keeps going. To practise the new one, press Start again: the new plan starts today, and your current plan moves to your earlier plans.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onUse}><Icon name="rotate-ccw" size={14} />Start again</Button>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-100"><Icon name="x" size={14} /></button>
      </div>
    </section>
  );
}

/**
 * Daily reminder: a switch and a time. Switching on asks the browser for notifications and shows one straight away, so the
 * player sees what the reminder looks like. A permission taken back in the browser settings shows as blocked.
 */
function Reminder({ state, update }: { state: PlanState; update: (c: (s: PlanState) => PlanState) => void }) {
  const [denied, setDenied] = useState(false);
  // only rendered once the plan has loaded (after mount), so reading the browser here can't mismatch the server render
  if (!notificationsSupported()) return null;
  const r = state.reminder;
  const blocked = denied || (r.enabled && Notification.permission !== "granted");
  const set = (enabled: boolean) => update((s) => ({ ...s, reminder: { ...s.reminder, enabled } }));
  const flip = async (on: boolean) => {
    if (!on) return set(false);
    const ok = await askNotifications();
    setDenied(!ok);
    set(ok);
    if (ok) confirmReminder(r.time);
  };
  const tone = r.enabled && !blocked ? HUE_TONES.amber.on : HUE_TONES.amber.off;
  return (
    // the blocked note floats below the switch, so the header row keeps one height
    <div className="relative">
      <div className={`flex h-10 items-center gap-2.5 rounded-lg border px-3 transition-colors [&_[role=checkbox]]:text-sm ${tone}`}>
        <Icon name={r.enabled ? "bell" : "bell-off"} size={16} className={r.enabled ? "text-amber-300" : "text-slate-500"} />
        <Checkbox checked={r.enabled} onChange={flip} title="A browser notification once a day. It shows only while attunr is open in a tab.">Remind me at</Checkbox>
        <input
          type="time"
          value={r.time}
          onChange={(e) => e.target.value && update((s) => ({ ...s, reminder: { ...s.reminder, time: e.target.value, lastShownOn: undefined } }))}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-1.5 py-1 text-sm text-slate-100 [color-scheme:dark]"
          aria-label="Reminder time"
        />
      </div>
      {blocked && <span className="absolute left-0 top-full mt-1 w-max max-w-xs text-[11px] text-rose-300">Notifications are blocked. Allow them for attunr in the browser settings.</span>}
    </div>
  );
}
