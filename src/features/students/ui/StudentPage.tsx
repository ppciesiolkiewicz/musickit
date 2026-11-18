"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button, Modal, Notice, btn } from "@/components/ui";
import { accountsOpen } from "@/features/account/serverAccountStore";
import { useAccount } from "@/features/account/useAccount";
import { GivenPlanView } from "@/features/plan/GivenPlan";
import { givenToday, localDate } from "@/features/plan/model/schedule";
import { MAX_TEACHER_COMMENT } from "@/features/plan/model/state";
import { dayWords } from "@/features/plan/model/today";
import { loginHref } from "@/lib/publicPaths";
import { fetchStudent, postStudentPlan, type Failure } from "../client";
import { moved, tenth } from "../model/sliders";
import type { MadePlan, StudentView } from "../model/types";
import type { Access } from "./StudentsApp";
import TopicSliders from "./TopicSliders";

/** The student's page as the page has it: loading, failed (a 404 is the not-found state), or the student. */
export type ViewState = { kind: "loading" } | { kind: "error"; code: string; error: string } | { kind: "view"; view: StudentView };

/** Making a plan: nothing asked yet, going out (and the page loading again after), what was made, or why not. */
export type Sent = { kind: "idle" } | { kind: "busy" } | { kind: "made"; line: string } | { kind: "failed"; error: string };

/** A local `yyyy-mm-dd` as the app writes a day: "Monday 23 November". */
const dayName = (date: string): string => dayWords(date, []).title;

/** The line after a plan was made: what attunr made and from which date, a short week, and what became of the comment. */
export function madeLine(name: string, made: Pick<MadePlan, "start" | "short" | "comment">, rotate: boolean, today: string): string {
  const when = made.start === today ? `today, ${dayName(made.start)}` : `on ${dayName(made.start)}`;
  const plan = rotate
    ? `attunr replaced ${name}'s plan for this week. The new plan keeps the same dates, from ${dayName(made.start)}.`
    : `attunr made ${name}'s next plan. It starts ${when}.`;
  const short = made.short ? ` Some days are shorter than the minutes you picked, because few exercises in the library fit ${name}'s answers.` : "";
  const comment = {
    stored: " Your words about this week are saved.",
    none: "",
    "no-week": ` Your words about this week weren't kept, because ${name} had no plan this week to keep them with.`,
  }[made.comment];
  return `${plan}${short}${comment}`;
}

/** What the page sends to make a plan: only the sliders the teacher moved, and the comment only when there is a week to put it on. */
export function planInput(today: string, rotate: boolean, start: Record<string, number>, values: Record<string, number>, comment: string, hasWeek: boolean) {
  return { today, rotate, scores: moved(start, values), comment: hasWeek ? comment : "" };
}

/** Where every slider opens: the student's score today, at a tenth. */
const openingValues = (view: StudentView): Record<string, number> => Object.fromEntries(view.topics.map((t) => [t.topic, tenth(t.now)]));

const primary = "!border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 hover:!bg-sky-400";
const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";
const warn = <Icon name="alert-triangle" size={14} />;

/** Who may see it, as the Students page words it, with Log in coming back to this student. */
function AccessLine({ access, id }: { access: Exclude<Access, "teacher">; id: string }) {
  if (access === "loading") return <p className="text-sm text-slate-500">Loading…</p>;
  if (access === "no-accounts") return <p className="text-sm text-slate-300">Adding students needs a teacher&apos;s account, and attunr is running without accounts here.</p>;
  if (access === "logged-out") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
        <p>Log in to see your students.</p>
        <Link href={loginHref(`/students/${id}`)} className={btn}>Log in</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
      <p>Only a teacher&apos;s account can have students. To add students, choose a Teacher plan on your account page.</p>
      <Link href="/account" className={btn}>Change your plan</Link>
    </div>
  );
}

const backLink = (
  <Link href="/students" className="inline-flex w-fit items-center gap-1 text-sm text-sky-300 hover:underline">
    <Icon name="chevron-left" size={14} />Students
  </Link>
);

/**
 * A student's page drawn from its state, so tests draw every state without a server: who may see it, the student
 * loading / not found / failed with Try again, then their name, the current week read-only as they see it ("No plan yet"
 * without one), and "Next plan": the sliders, "Anything else about this week?" (only with a week), Make next week's plan,
 * and Rotate this week's plan while a week runs, which asks once before replacing it.
 */
export function StudentPageView({ access, id, state, today, values, onValue, comment, onComment, sent, onMake, confirming, onConfirm, onRetry, day, onDay }: {
  access: Access;
  id: string;
  state: ViewState;
  /** the device's date */
  today: string;
  /** where each slider is now */
  values: Record<string, number>;
  onValue: (topic: string, value: number) => void;
  comment: string;
  onComment: (text: string) => void;
  sent: Sent;
  /** make a plan: the next week, or (rotate) a new one in place of this week's */
  onMake: (rotate: boolean) => void;
  /** the question before rotating is open */
  confirming: boolean;
  /** open (true) or close (false) the question before rotating */
  onConfirm: (open: boolean) => void;
  onRetry: () => void;
  /** the day of the week opened (null: today's) */
  day: number | null;
  onDay: (d: number) => void;
}) {
  if (access !== "teacher") return <AccessLine access={access} id={id} />;
  if (state.kind === "loading") return <p className="text-sm text-slate-500">Loading your student…</p>;
  if (state.kind === "error" && state.code === "not-found") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
        <p>{state.error} Your students are on the Students page.</p>
        <Link href="/students" className={btn}><Icon name="chevron-left" size={14} />Open Students</Link>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        {sent.kind === "made" && <Notice icon={<Icon name="check" size={14} />}><span role="status">{sent.line}</span></Notice>}
        <Notice tone="warn" icon={warn}>{state.error}</Notice>
        <Button onClick={onRetry}><Icon name="rotate-ccw" size={12} />Try again</Button>
      </div>
    );
  }

  const { student, plan, topics } = state.view;
  const running = !!plan && !givenToday(plan, today).over;
  const busy = sent.kind === "busy";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {backLink}
        <h2 className="text-2xl font-semibold text-slate-50">{student.name}</h2>
        <p className="text-sm text-slate-400">{student.email}</p>
      </div>

      <section aria-labelledby="this-week" className="flex flex-col gap-2">
        <h3 id="this-week" className="text-lg font-semibold text-slate-100">{!plan || running ? "This week" : "Last plan"}</h3>
        {plan ? (
          <GivenPlanView plan={plan} date={today} day={day} onDay={onDay} controls={null} corner={null} />
        ) : (
          <p className="text-sm text-slate-300">No plan yet. Press Make next week&apos;s plan below, and the new plan starts today.</p>
        )}
      </section>

      <section aria-labelledby="next-plan" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="next-plan" className="text-lg font-semibold text-slate-100">Next plan</h3>
          <p className="text-sm leading-relaxed text-slate-400">
            Each slider shows {student.name}&apos;s level in a topic today.{plan && <> The mark on a slider shows where {student.name} was when this plan started.</>}
          </p>
          <p className="text-sm leading-relaxed text-slate-400">
            Move a slider to set {student.name}&apos;s level in that topic from now on. A slider you leave alone changes nothing.
          </p>
        </div>

        <TopicSliders topics={topics} values={values} onChange={onValue} disabled={busy} />

        {plan && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="teacher-comment" className="text-sm font-medium text-slate-200">Anything else about this week?</label>
            <textarea id="teacher-comment" rows={3} maxLength={MAX_TEACHER_COMMENT} value={comment} disabled={busy} onChange={(e) => onComment(e.target.value)} className={field} />
          </div>
        )}

        {sent.kind === "failed" && <Notice tone="warn" icon={warn}><span role="alert">{sent.error}</span></Notice>}
        {sent.kind === "made" && <Notice icon={<Icon name="check" size={14} />}><span role="status">{sent.line}</span></Notice>}
        {busy && <p role="status" className="text-sm text-slate-400">Making the plan…</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button className={primary} disabled={busy} onClick={() => onMake(false)}><Icon name="plus" size={14} />Make next week&apos;s plan</Button>
          {running && <Button disabled={busy} onClick={() => onConfirm(true)}><Icon name="rotate-ccw" size={12} />Rotate this week&apos;s plan</Button>}
        </div>
      </section>

      {confirming && running && (
        <Modal title="Replace this week's plan?" narrow onClose={() => onConfirm(false)}>
          <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-300">
            <p>attunr makes {student.name} a new plan for the same dates, from the sliders as you set them. The new plan takes the place of the one {student.name} is in now.</p>
            <p>{student.name}&apos;s ratings stay and still count toward their next plans.</p>
            <div className="flex flex-wrap gap-3">
              <Button className={primary} onClick={() => onMake(true)}>Replace the plan</Button>
              <Button onClick={() => onConfirm(false)}>Keep this plan</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** A loaded student as the page's state, and where the sliders open; a failure as the page's error state. */
function viewOf(r: ({ ok: true } & StudentView) | Failure): { state: ViewState; start: Record<string, number> | null } {
  if (!r.ok) return { state: { kind: "error", code: r.code, error: r.error }, start: null };
  const view: StudentView = { student: r.student, plan: r.plan, topics: r.topics };
  return { state: { kind: "view", view }, start: openingValues(view) };
}

/**
 * A teacher's page for one student (`GET /api/students/<id>`): their current week, read-only, and the next plan made with
 * the sliders (`POST …/plan`). Only the sliders the teacher moved are sent; after a plan is made the page loads the
 * student again, so the sliders open at the new scores and the comment box is empty.
 */
export default function StudentPage({ id }: { id: string }) {
  const { account, loaded, can } = useAccount();
  const access: Access = !loaded ? "loading" : !account ? (accountsOpen() ? "logged-out" : "no-accounts") : can("students") ? "teacher" : "not-teacher";
  const [today] = useState(() => localDate());
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [start, setStart] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState<Sent>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [day, setDay] = useState<number | null>(null);

  const show = (r: ({ ok: true } & StudentView) | Failure) => {
    const next = viewOf(r);
    setState(next.state);
    if (next.start) {
      setStart(next.start);
      setValues(next.start);
      setDay(null);
    }
  };

  // Try again sets the state to loading and asks again
  const [asked, setAsked] = useState(0);
  useEffect(() => {
    if (access !== "teacher") return;
    let live = true;
    fetchStudent(id, today).then((r) => {
      if (!live) return;
      const next = viewOf(r);
      setState(next.state);
      if (next.start) {
        setStart(next.start);
        setValues(next.start);
      }
    });
    return () => {
      live = false;
    };
  }, [access, id, today, asked]);
  const retry = () => {
    setState({ kind: "loading" });
    setAsked((n) => n + 1);
  };

  const make = async (rotate: boolean) => {
    if (state.kind !== "view" || sent.kind === "busy") return;
    setConfirming(false);
    setSent({ kind: "busy" });
    const r = await postStudentPlan(id, planInput(today, rotate, start, values, comment, !!state.view.plan));
    if (!r.ok) {
      setSent({ kind: "failed", error: r.error });
      return;
    }
    setComment("");
    show(await fetchStudent(id, today));
    setSent({ kind: "made", line: madeLine(state.view.student.name, r, rotate, today) });
  };

  return (
    <StudentPageView
      access={access}
      id={id}
      state={state}
      today={today}
      values={values}
      onValue={(topic, v) => setValues((m) => ({ ...m, [topic]: tenth(v) }))}
      comment={comment}
      onComment={setComment}
      sent={sent}
      onMake={(rotate) => void make(rotate)}
      confirming={confirming}
      onConfirm={setConfirming}
      onRetry={retry}
      day={day}
      onDay={setDay}
    />
  );
}
