"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button, Checkbox, HUE_TONES, Modal } from "@/components/ui";
import { DEFAULT_ANSWERS } from "./intake/answers";
import { randomId } from "./model/exerciseIds";
import { recordAnswers } from "./model/answersHistory";
import { backfill } from "./model/progressLog";
import { useProgress } from "@/features/progress/useProgress";
import { storedPlans } from "./model/schedule";
import type { PlanAnswers, PlanState, StoredPlan } from "./model/types";
import { askNotifications, confirmReminder, notificationsSupported } from "./reminders";
import { useAllPlanTimes, usePlan, usePlanStore, usePlanTimes } from "./store/usePlan";
import { BIG, CornerLabels, PhoneLabels, SharePlan, rateHandler } from "./ui/planPieces";
import GivenPlans from "./ui/GivenPlans";
import { outcome } from "./model/outcome";
import { mergeTimes } from "./model/trackerView";
import StreakButton from "./ui/tracker/StreakButton";
import ProgressTracker from "./ui/tracker/ProgressTracker";
import PlanFlow, { savedFlow } from "./ui/PlanFlow";
import DayPlan, { TodayStatus } from "./ui/DayPlan";
import PastDays from "./ui/PastDays";
import { useClockDate, useTodayPlan } from "./ui/useTodayPlan";
import { usePlanAgentTools } from "./ui/useBlockAgentTools";
import { FixedLabelRoot } from "@/features/theory/useLabelSystem";
import { useAccount } from "@/features/account/useAccount";
import { taughtView } from "./model/today";
import TaughtPlanView from "./ui/TaughtPlan";
import { LiveGivenPlan } from "./GivenPlan";

/**
 * The player's own daily plan. Without answers: the intro and Start, which runs the questions in one step modal. With
 * answers: today's plan, composed on the server the first time the page opens that day (`useTodayPlan`), drawn by
 * `DayPlan`, with Get another plan; while it is made or when it can't be, `TodayStatus` says so where the plan would be.
 * Past days are listed under it, read-only. The plans the player was given are listed (`GivenPlans`), each a link to its own
 * page (`/plan/given/<id>`); they are never drawn here.
 *
 * A teacher's student (`Account.taught`) gets their teacher's weeks instead (`TaughtPlanView`, decided by `taughtView`):
 * the week covering today drawn live as on its own page, no questionnaire, no composing (`useTodayPlan` is `off` for them,
 * and until the account is known), no Get another plan, no Change my answers.
 */
export default function PlanApp() {
  const { state, loaded, update } = usePlan();
  const { account, loaded: accountLoaded } = useAccount();
  const taught = !!account?.taught;
  const progress = useProgress();
  // ratings given before the log existed: copied into it once, the first time it is found empty
  const filled = useRef(false);
  useEffect(() => {
    if (!loaded || !progress.loaded || filled.current) return;
    filled.current = true;
    if (progress.entries.length) return;
    for (const row of backfill(storedPlans(state), randomId)) progress.put(row);
  }, [loaded, progress, state]);
  // a flow left open (reload, hot reload) comes back; the modal only renders after the store loads, so no hydration mismatch
  const [flow, setFlow] = useState(() => (typeof window === "undefined" ? false : !!savedFlow()));
  // the clock's date, moving at midnight: the streak's day, and today's plan's (which waits for an open edit or request)
  const today = useClockDate();
  const store = usePlanStore();
  // the day the player has open in the day editor: the AI leaves it alone until Done, and a new date waits for it
  const [editingDay, setEditingDay] = useState<number | null>(null);

  // today's own plan, composed on the server when the page has answers and none for today
  const day = useTodayPlan(state, loaded, update, store, today, editingDay !== null, !accountLoaded || taught);
  const plan = day.view.kind === "plan" ? day.view.plan : null;
  // the day timer's seconds, kept apart from the plan
  const { times, loaded: timesLoaded, saveTime } = usePlanTimes(plan?.id ?? null);
  // the streak and the progress tracker: every plan's timer records with this plan's live ones laid over them, so
  // today's saves count without a reload; every plan counts, the given ones too (as the server's `playerProgress`)
  const all = useAllPlanTimes();
  const [tracking, setTracking] = useState(false);
  const plans = useMemo(() => storedPlans(state), [state]);
  const allTimes = useMemo(() => mergeTimes(all.times, times), [all.times, times]);
  const result = useMemo(
    () => outcome({ plans, entries: progress.entries, times: allTimes, answersHistory: state.answersHistory, teacherScores: state.teacherScores }, today),
    [plans, progress.entries, allTimes, state.answersHistory, state.teacherScores, today],
  );
  // only once every input has loaded, so the count never shows 0 first; a refused read leaves it out
  const streak = all.loaded && progress.loaded ? <StreakButton streak={result.streak} onOpen={() => setTracking(true)} /> : null;
  const tracker = tracking && (
    <Modal title="Your progress" medium onClose={() => setTracking(false)}>
      <ProgressTracker outcome={result} answers={state.answers} />
    </Modal>
  );

  // a finished flow keeps the answers, remembered with their date; with answers and no plan for today, `useTodayPlan` puts
  // one together, so the player lands on the plan being made
  const onAnswers = (answers: PlanAnswers) => {
    const at = new Date().toISOString();
    update((s) => ({ ...recordAnswers(s, answers, at), answers }));
    setFlow(false);
    // today's plan stays as it is; with none (it failed), the new answers may make one: ask again
    if (day.view.kind === "plan") setAnswersSaved(true);
    else if (day.view.kind === "failed") day.retry();
  };
  // the answers were changed while today's plan was there: said under the header until closed, or until Get another plan
  // answers (a new set, or none), as the notice tells the player to press it
  const [answersSaved, setAnswersSaved] = useState(false);
  const attempt = plan?.composed?.attempt ?? null;
  const [seen, setSeen] = useState({ attempt, none: day.none });
  if (seen.attempt !== attempt || seen.none !== day.none) {
    // a new set came, or the answer was "no other exercises" (`none` turning false is only the next press going out)
    const answered = seen.attempt !== attempt || day.none;
    setSeen({ attempt, none: day.none });
    if (answered && answersSaved) setAnswersSaved(false);
  }
  const setPlan = (change: (p: StoredPlan) => StoredPlan) => update((s) => (s.current && s.current.id === plan?.id ? { ...s, current: change(s.current) } : s));
  // the browser AI's block tools, while a plan runs
  usePlanAgentTools(loaded ? plan : null, (next) => setPlan(() => next), editingDay);
  const rate = rateHandler(plan, setPlan, progress);

  if (!loaded || !timesLoaded || !accountLoaded) return <p className="text-sm text-slate-500">Loading…</p>;

  if (taught) {
    // the teacher's week, live as on its own page (keyed by id: a newer week starts on its own day); the reminder reads it too
    const controls = <><Reminder state={state} update={update} /><PhoneLabels /></>;
    return (
      <>
        <TaughtPlanView view={taughtView(state, today)} week={(p) => <LiveGivenPlan key={p.id} id={p.id} date={today} controls={() => controls} />} streak={streak} given={state.given} />
        {tracker}
      </>
    );
  }

  const modal = flow && (
    <PlanFlow answers={state.answers ?? DEFAULT_ANSWERS} current={plan} onAnswers={onAnswers} onClose={() => setFlow(false)} />
  );
  const primary = "!rounded-xl !border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 shadow-md shadow-sky-500/20 transition hover:!bg-sky-400";

  const past = <PastDays history={state.history} current={state.current} date={day.date} />;
  // the plans the player was given, each a link to its own page; above the intro, too (a plan can be claimed before the questions)
  const given = <GivenPlans plans={state.given} />;
  // the questionnaire again, from the stored answers (areas, where you are in each topic, minutes a day)
  const changeAnswers = (
    <Button onClick={() => setFlow(true)} title="Answer the questions again: what you play, where you are in each topic, and how long you practise a day" className={BIG}>
      <Icon name="pencil" size={16} />Change my answers
    </Button>
  );

  if (day.view.kind === "intro") {
    return (
      <div className="flex flex-col gap-4">
        {state.history.length > 0 && streak && <div>{streak}</div>}
        {given}
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
          <Button data-tour="plan-start" onClick={() => setFlow(true)} className={`${primary} px-5 py-2 text-sm`}><Icon name="sparkles" size={16} />Start</Button>
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
        {(day.view.kind === "making" || day.view.kind === "failed") && <TodayStatus view={day.view} onRetry={day.retry} answers={changeAnswers} />}
        {given}
        {past}
        {modal}
        {tracker}
      </div>
    );
  }

  // the Labels control: a pill over the day timer, or on a phone in the header row, so the corner stays small
  const controls = (<>
    {changeAnswers}
    <Reminder state={state} update={update} />
    <PhoneLabels />
    <SharePlan planId={plan.id} />
  </>);
  return (
    <FixedLabelRoot value="scale">
      {/* necks keep the page's margins rather than bleeding to the window's edge */}
      <div className="flex flex-col gap-4 pb-28 [&_.bleed]:mx-0">
        <DayPlan
          plan={plan}
          streak={streak}
          controls={controls}
          notice={answersSaved && <AnswersSaved onClose={() => setAnswersSaved(false)} />}
          onAnother={day.another}
          asking={day.asking}
          none={day.none}
          anotherFailed={day.anotherFailed}
          editing={editingDay !== null}
          onRate={rate}
          times={times}
          onTime={saveTime}
          onEdit={(next) => setPlan(() => next)}
          onEditing={setEditingDay}
          corner={<CornerLabels />}
        />
        {given}
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

/** After Change my answers with today's plan there: what was saved, that the plan stays, and how to get one from the new answers. */
function AnswersSaved({ onClose }: { onClose: () => void }) {
  return (
    <section role="status" className="flex flex-wrap items-start gap-3 rounded-2xl border border-l-4 border-slate-700 border-l-emerald-400 bg-slate-900/80 p-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-base text-slate-100">Your answers are saved</h2>
        <p className="text-sm text-slate-400">Today&apos;s plan stays as it is. For a plan from your new answers, press Get another plan.</p>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-100"><Icon name="x" size={14} /></button>
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
