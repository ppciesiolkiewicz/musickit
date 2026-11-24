"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Checkbox, HUE_TONES } from "@/components/ui";
import { errorOf, send } from "@/features/account/ui/parts";
import { DEFAULT_TIME, QUARTER_TIMES, type ReminderSettings } from "../model";

const zoneHere = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/**
 * /plan's daily reminder email: a switch and a quarter-hour time, saved on the account (`/api/me/reminder`) with this
 * browser's time zone. The zone is saved again when the page opens somewhere else. Hidden until loaded; a failed load or
 * save says so under the switch.
 */
export default function ReminderControl() {
  const [r, setR] = useState<ReminderSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: ReminderSettings) => {
    const before = r;
    setR(next);
    setError(null);
    const res = await send("/api/me/reminder", "PATCH", next);
    if (!res.ok) {
      setR(before);
      setError(errorOf(res));
    }
  };

  useEffect(() => {
    let live = true;
    void send("/api/me/reminder", "GET").then((res) => {
      if (!live) return;
      if (!res.ok) return setError(errorOf(res));
      const got = res.body.reminder as ReminderSettings | null;
      const zone = zoneHere();
      const loaded = got ?? { enabled: false, time: DEFAULT_TIME, zone };
      setR(loaded);
      // the player moved zone (or a new device): keep the email at their local time
      if (got && got.zone !== zone) void send("/api/me/reminder", "PATCH", { ...got, zone });
    });
    return () => { live = false; };
  }, []);

  if (!r) return error ? <span className="text-[11px] text-rose-300">{error}</span> : null;
  const tone = r.enabled ? HUE_TONES.amber.on : HUE_TONES.amber.off;
  return (
    // the error floats below the switch, so the header row keeps one height
    <div className="relative">
      {/* one line down to a 320 px phone: the label never wraps, and under 340 px the icon gives its room to it */}
      <div className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 transition-colors sm:gap-2.5 sm:px-3 [&_[role=checkbox]]:text-sm ${tone}`}>
        <Icon name={r.enabled ? "bell" : "bell-off"} size={16} className={`max-[339px]:hidden ${r.enabled ? "text-amber-300" : "text-slate-500"}`} />
        <Checkbox checked={r.enabled} onChange={(on) => void save({ ...r, enabled: on, zone: zoneHere() })} title="An email once a day at this time, while today's plan isn't done.">
          Email me at
        </Checkbox>
        <select
          value={r.time}
          onChange={(e) => void save({ ...r, time: e.target.value, zone: zoneHere() })}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-1.5 py-1 text-sm text-slate-100"
          aria-label="Reminder email time"
        >
          {QUARTER_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {error && <span role="alert" className="absolute left-0 top-full mt-1 w-max max-w-xs text-[11px] text-rose-300">{error}</span>}
    </div>
  );
}
