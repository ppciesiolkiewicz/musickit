"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button, btn } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import type { Stars } from "@/features/progress/stars";
import type { DayTime } from "../model/planTime";
import type { StoredPlan } from "../model/types";
import type { TodayFailure, TodayView } from "../model/today";
import { loginHref } from "@/lib/publicPaths";
import { DayPanel } from "./WeekView";

/** The control that asks for another plan: one name in every line that names it. */
export const ANOTHER = "Get another plan";

const panel = "flex flex-wrap items-start gap-3 rounded-2xl border border-l-4 border-slate-700 bg-slate-900/80 p-4 metal-panel";
const primary = "!rounded-xl !border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 shadow-md shadow-sky-500/20 transition hover:!bg-sky-400";
const big = "h-10 !rounded-xl px-4 text-sm";

/** Why Get another plan can't be pressed while the day editor is open: a line under the controls, read with the button. */
const EDITING_LINE = `Press Done or Cancel in the editor first. Then press ${ANOTHER}.`;

/** Log in, coming back to /plan: offered wherever a line says the player is logged out. */
const LogIn = () => <Link href={loginHref("/plan")} className={btn}>Log in</Link>;

/** Why another plan didn't come: the plan stays as it is in every case. */
const ANOTHER_FAILED: Record<TodayFailure, string> = {
  offline: `attunr couldn't reach the server, so your plan stays as it is. Check your connection, then press ${ANOTHER} again.`,
  failed: `attunr couldn't put another plan together, so your plan stays as it is. Press ${ANOTHER} to try again.`,
  "bad-date": "The date on your device isn't today's date on attunr, so your plan stays as it is. Check your device's date and time, then reload the page.",
  later: "A plan for a later day is already running on another device or tab, so this plan stays as it is. The date on this device is behind that day. Check this device's date and time.",
  "logged-out": `You're logged out, so your plan stays as it is. Log in, then press ${ANOTHER} again.`,
  "account-changed": `Another account is logged in now, so your plan stays as it is. Reload the page, then press ${ANOTHER} again.`,
  "no-blocks": "There are no other exercises for today's steps, so your plan stays as it is.",
};

/**
 * Today's plan, one composed day: "Today's plan" and the streak, the date as its title, the topics it practises, the header's
 * controls (`controls`, the host's) with Get another plan, then the day's exercises with their stars and the day timer
 * (`DayPanel`, the list the week view draws for a day, with no day strip). A line under the controls (a live region,
 * always there) says when another plan couldn't come or found no other exercises; the short-day line sits under the
 * exercises. A new set from Get another plan starts with the timer stopped; Edit can't be pressed while it is asked for, and
 * Get another plan can't be pressed while the day editor is open (`editing`: a new set would drop the editor's draft).
 */
export default function DayPlan({ plan, streak, controls, notice, onAnother, asking, none, anotherFailed, editing = false, onRate, times, onTime, onEdit, onEditing, corner }: {
  plan: StoredPlan;
  streak: ReactNode;
  controls: ReactNode;
  /** a notice of the host's under the header (answers saved) */
  notice?: ReactNode;
  onAnother: () => void;
  asking: boolean;
  /** another plan found no other exercises: the plan stays */
  none: boolean;
  anotherFailed: TodayFailure | null;
  /** the day editor is open: Get another plan waits for Done or Cancel */
  editing?: boolean;
  onRate: (day: number, ex: number, stars: Stars | null) => void;
  times: DayTime[];
  onTime: (time: DayTime) => void;
  onEdit: (next: StoredPlan) => void;
  onEditing: (day: number | null) => void;
  corner: ReactNode;
}) {
  const theme = plan.config.days[0]?.theme;
  const line = none ? ANOTHER_FAILED["no-blocks"] : anotherFailed ? ANOTHER_FAILED[anotherFailed] : null;
  // the try shown when the page opened starts its timer by itself; a later one (Get another plan) starts stopped
  const attempt = plan.composed?.attempt ?? 0;
  const [first] = useState(attempt);
  return (
    <>
      <div className="mt-4 mb-2 flex flex-col gap-5 sm:mt-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">Today&apos;s plan</p>
            {streak}
          </div>
          <h2 className="mt-2 text-3xl text-slate-50" style={DISPLAY}>{plan.config.title}</h2>
          {theme && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{theme}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {/* busy or waiting on the editor, it keeps focus: aria-disabled and presses ignored, not disabled */}
          <Button data-tour="plan-another" onClick={() => !asking && !editing && onAnother()} aria-disabled={asking || editing} aria-describedby={editing ? "plan-another-editing" : undefined} title={editing ? undefined : "attunr swaps the exercises you haven't rated for other ones. The ones you rated stay."} className={`${primary} ${big} ${asking ? "cursor-wait opacity-70" : editing ? "cursor-not-allowed opacity-50" : ""}`}>
            <Icon name="sparkles" size={16} />{asking ? "Getting another plan…" : ANOTHER}
          </Button>
        </div>
        {/* on screen, not only in a title: a phone has no hover, and a screen reader reads it with the button */}
        {editing && <p id="plan-another-editing" className="-mt-3 text-xs text-slate-400">{EDITING_LINE}</p>}
      </div>

      {notice}

      <div role="status" aria-live="polite">
        {line && (
          <div className={`${panel} ${none ? "border-l-sky-400" : "border-l-rose-400"}`}>
            <p className="min-w-0 flex-1 text-sm text-slate-300">{line}</p>
            {/* the one failure a press here can mend: the same Log in as today's plan's line */}
            {!none && anotherFailed === "logged-out" && <LogIn />}
          </div>
        )}
      </div>

      <DayPanel key={attempt} plan={plan} day={0} heading={null} timerLabel="Today" autoStart={attempt === first} onRate={onRate} times={times} onTime={onTime} onEdit={onEdit} editLocked={asking} onEditing={onEditing} corner={corner} />

      {plan.composed?.short && (
        <p className="text-sm text-slate-400">This plan is shorter than the time you set for a day. The library has no more exercises for today&apos;s steps yet.</p>
      )}
    </>
  );
}

/** What today's plan says while it is put together, or why it isn't there, with what to do next. `answers`: Change my answers, offered when no plan came. */
export function TodayStatus({ view, onRetry, answers }: { view: Extract<TodayView, { kind: "making" | "failed" }>; onRetry: () => void; answers: ReactNode }) {
  if (view.kind === "making") {
    return (
      <p role="status" className="flex items-center gap-2 py-6 text-sm text-slate-300">
        <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />attunr is putting today&apos;s plan together…
      </p>
    );
  }
  const failed = view.failure;
  if (failed === "no-blocks") {
    return (
      <section role="status" className={`${panel} border-l-amber-400`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-base text-slate-100">No plan today</h2>
          <p className="text-sm text-slate-400">The library has no exercises yet that fit your answers, so attunr couldn&apos;t make today&apos;s plan. Press Change my answers to pick other areas.</p>
        </div>
        {answers}
      </section>
    );
  }
  const body: Record<Exclude<TodayFailure, "no-blocks">, string> = {
    offline: "attunr couldn't reach the server. Check your connection, then press Try again.",
    "bad-date": "The date on your device isn't today's date on attunr. Check your device's date and time, then press Reload page.",
    // a reload asks for this device's date again: the page moves by itself once the device's date reaches the plan's
    later: "A plan for a later day is already running on another device or tab. The date on this device is behind that day, so attunr can't show that plan here. Check this device's date and time: the plan shows here once the date is right.",
    "logged-out": "You're logged out, so attunr couldn't make today's plan. Log in, then come back to this page.",
    "account-changed": "Another account is logged in now, so attunr couldn't make today's plan. Press Reload page to open the plan of the account that's logged in.",
    failed: "attunr couldn't put today's plan together. Press Try again. If the plan still doesn't come, try again in a few minutes.",
  };
  const action = failed === "later" ? null
    : failed === "logged-out" ? <LogIn />
      : failed === "bad-date" || failed === "account-changed" ? <Button onClick={() => window.location.reload()}><Icon name="rotate-ccw" size={14} />Reload page</Button>
        : <Button onClick={onRetry}><Icon name="rotate-ccw" size={14} />Try again</Button>;
  return (
    <section role="alert" className={`${panel} border-l-rose-400`}>
      <div className="min-w-0 flex-1">
        <h2 className="text-base text-slate-100">Today&apos;s plan isn&apos;t ready</h2>
        <p className="text-sm text-slate-400">{body[failed]}</p>
      </div>
      {action}
    </section>
  );
}
