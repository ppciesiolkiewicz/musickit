"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button, Modal, Notice, btn } from "@/components/ui";
import { accountsOpen } from "@/features/account/serverAccountStore";
import { useAccount } from "@/features/account/useAccount";
import { GivenPlanView } from "@/features/plan/GivenPlan";
import { givenToday, localDate } from "@/features/plan/model/schedule";
import { MAX_TEACHER_COMMENT } from "@/features/plan/model/state";
import { loginHref } from "@/lib/publicPaths";
import { fetchStudent, postStudentPlan, type Failure } from "../client";
import { afterMake, planInput, upcomingLine, viewOf, waitingLine, type MakeForm, type Sent, type ViewState } from "../model/makeFlow";
import { tenth } from "../model/sliders";
import type { StudentView } from "../model/types";
import type { Access } from "./StudentsApp";
import PlanWays from "./PlanWays";
import TopicSliders from "./TopicSliders";

const primary = "!border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 hover:!bg-sky-400";
const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";
const warn = <Icon name="alert-triangle" size={14} />;

/** The title of the question before Rotate this week's plan. */
export const ROTATE_TITLE = "Rotate this week's plan?";

/** The question before Rotate this week's plan, inside its `Modal`: what changes, what stays, and the two answers. */
export function RotateQuestion({ name, onRotate, onKeep }: { name: string; onRotate: () => void; onKeep: () => void }) {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-300">
      <p>attunr makes {name} a new plan for the same dates, from the sliders as you set them. The new plan takes the place of the one {name} is in now.</p>
      <p>{name}&apos;s ratings stay and still count toward their next plans.</p>
      <div className="flex flex-wrap gap-3">
        <Button className={primary} onClick={onRotate}>Rotate the plan</Button>
        <Button onClick={onKeep}>Keep this plan</Button>
      </div>
    </div>
  );
}

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
 * loading / not found / failed with Try again, then their name, the line that a next plan is waiting (when one is) and a
 * link down to Next plan (the week between is long on a phone), the current week read-only as they see it ("No plan yet"
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

  const { student, plan, topics, upcoming } = state.view;
  const running = !!plan && !givenToday(plan, today).over;
  const busy = sent.kind === "busy";
  // right after a next week is made, the notice under Next plan already says it is made and when it starts
  const waiting = upcoming && !(sent.kind === "made" && sent.next) ? upcoming : null;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {backLink}
        <h2 className="text-2xl font-semibold text-slate-50">{student.name}</h2>
        <p className="text-sm text-slate-400">{student.email}</p>
        {/* the week below is long on a phone, so a waiting next plan is said here, with the way down to Next plan */}
        <div className="mt-1 flex flex-col items-start gap-2">
          {waiting && <p className="text-sm leading-relaxed text-slate-300">{waitingLine(student.name, waiting.start)}</p>}
          <a href="#next-plan" className={btn}><Icon name="chevron-down" size={14} />Next plan</a>
        </div>
      </div>

      <section aria-labelledby="this-week" className="flex flex-col gap-2">
        <h3 id="this-week" className="text-lg font-semibold text-slate-100">{!plan || running ? "This week" : "Last plan"}</h3>
        {plan ? (
          <GivenPlanView plan={plan} date={today} day={day} onDay={onDay} ratedBy={student.name} controls={null} corner={null} />
        ) : (
          <p className="text-sm text-slate-300">No plan yet. Press Make next week&apos;s plan below, and the new plan starts today.</p>
        )}
      </section>

      <section aria-labelledby="next-plan" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="next-plan" className="scroll-mt-4 text-lg font-semibold text-slate-100">Next plan</h3>
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

        {sent.kind === "failed" && (
          <Notice tone="warn" icon={warn}>
            <span className="flex flex-col items-start gap-2">
              <span role="alert">{sent.error}</span>
              {sent.code === "limit" && <PlanWays />}
            </span>
          </Notice>
        )}
        {sent.kind === "made" && <Notice icon={<Icon name="check" size={14} />}><span role="status">{sent.line}</span></Notice>}
        {busy && <p role="status" className="text-sm text-slate-400">Making the plan…</p>}
        {waiting && <p className="text-sm leading-relaxed text-slate-300">{upcomingLine(student.name, waiting.start)}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button className={primary} disabled={busy} onClick={() => onMake(false)}><Icon name="plus" size={14} />Make next week&apos;s plan</Button>
          {running && <Button disabled={busy} onClick={() => onConfirm(true)}><Icon name="rotate-ccw" size={12} />Rotate this week&apos;s plan</Button>}
        </div>
      </section>

      {confirming && running && (
        <Modal title={ROTATE_TITLE} narrow onClose={() => onConfirm(false)}>
          <RotateQuestion name={student.name} onRotate={() => onMake(true)} onKeep={() => onConfirm(false)} />
        </Modal>
      )}
    </div>
  );
}

/**
 * A teacher's page for one student (`GET /api/students/<id>`): their current week, read-only, and the next plan made with
 * the sliders (`POST …/plan`). Only the sliders the teacher moved are sent; after a plan is made the page loads the
 * student again, so the sliders open at the new scores and the comment box at the comment saved on the week now shown
 * (`afterMake`, `viewOf`).
 */
export default function StudentPage({ id }: { id: string }) {
  const { account, loaded, can } = useAccount();
  const access: Access = !loaded ? "loading" : !account ? (accountsOpen() ? "logged-out" : "no-accounts") : can("students") ? "teacher" : "not-teacher";
  const [today] = useState(() => localDate());
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [form, setForm] = useState<MakeForm>({ start: {}, values: {}, comment: "", savedComment: "" });
  const [sent, setSent] = useState<Sent>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [day, setDay] = useState<number | null>(null);

  // the one way a loaded student reaches the page: its state, every slider opening at the score today, and the comment
  // box at the comment already saved on this week
  const show = useCallback((r: ({ ok: true } & StudentView) | Failure) => {
    const next = viewOf(r);
    setState(next.state);
    if (next.opening) {
      const opening = next.opening;
      const saved = next.comment ?? "";
      setForm({ start: opening, values: opening, comment: saved, savedComment: saved });
      setDay(null);
    }
  }, []);

  // Try again sets the state to loading and asks again
  const [asked, setAsked] = useState(0);
  useEffect(() => {
    if (access !== "teacher") return;
    let live = true;
    fetchStudent(id, today).then((r) => {
      if (live) show(r);
    });
    return () => {
      live = false;
    };
  }, [access, id, today, asked, show]);
  const retry = () => {
    setState({ kind: "loading" });
    setAsked((n) => n + 1);
  };

  const make = async (rotate: boolean) => {
    if (state.kind !== "view" || sent.kind === "busy") return;
    setConfirming(false);
    setSent({ kind: "busy" });
    const r = await postStudentPlan(id, planInput(today, rotate, form, !!state.view.plan));
    const after = afterMake(r, form, state.view.student.name, rotate, today);
    setForm(after.form);
    if (after.reload) show(await fetchStudent(id, today));
    setSent(after.sent);
  };

  return (
    <StudentPageView
      access={access}
      id={id}
      state={state}
      today={today}
      values={form.values}
      onValue={(topic, v) => {
        setForm((f) => ({ ...f, values: { ...f.values, [topic]: tenth(v) } }));
        // the line about the last plan made reads as stale once a slider moves again
        setSent((x) => (x.kind === "made" ? { kind: "idle" } : x));
      }}
      comment={form.comment}
      onComment={(comment) => setForm((f) => ({ ...f, comment }))}
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
