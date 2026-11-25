"use client";

import Icon from "@/components/Icon";
import { QUARTER_TIMES, type ReminderSettings } from "../model";

/** The browser's time zone, sent with the reminder so its time stays the player's local time. */
export const zoneHere = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/**
 * /account/setup's daily reminder, among the consents: a box and a quarter-hour time, controlled by the form and saved
 * with the account. On at 18:00 by default (the form's choice); amber like /plan's "Email me at", so the two read as
 * one thing. Changed later on the Practice plan page.
 */
export function ReminderSetupBox({ value, onChange }: { value: ReminderSettings; onChange: (next: ReminderSettings) => void }) {
  const on = value.enabled;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${on ? "border-amber-400/40 bg-amber-500/10" : "border-slate-700/70 bg-slate-900/40"}`}>
      <span aria-hidden className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? "bg-amber-400/15 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
        <Icon name={on ? "bell" : "bell-off"} size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4 shrink-0 accent-amber-400" checked={on} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
            <span className="font-medium text-slate-100">Remind me to practice at</span>
          </label>
          <select
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value, enabled: true })}
            className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100"
            aria-label="Reminder time"
          >
            {QUARTER_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">
          One email a day at this time, only on days you haven&apos;t finished today&apos;s plan. You can change it on the Practice plan page at any time.
        </span>
      </div>
    </div>
  );
}
