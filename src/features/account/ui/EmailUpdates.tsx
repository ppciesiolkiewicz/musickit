"use client";

import { useState } from "react";
import type { Account } from "../model";
import { ErrorLine, errorOf, send } from "./parts";

/**
 * The marketing consent box: emails with news about the app (`users.email_updates_at`). Never ticked for someone:
 * setup starts it unticked, and /account shows what they chose. `where` ends the hint with where to turn it off.
 */
export function EmailUpdatesBox({ checked, onChange, disabled = false, where }: {
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  where: "here" | "account";
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex flex-col gap-0.5">
        <span className="text-slate-200">Email me news about the app</span>
        <span className="text-xs text-slate-500">
          Now and then: new lessons and tools, and what we changed.{" "}
          {where === "here" ? "You can turn it off here at any time." : "You can turn it off on your account page at any time."}
        </span>
      </span>
    </label>
  );
}

/** The box on /account: saved as soon as it changes (`PATCH /api/account`). */
export default function EmailUpdates({ account }: { account: Account }) {
  const [on, setOn] = useState(account.emailUpdates);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    setBusy(true);
    setSaved(false);
    setError(null);
    const r = await send("/api/account", "PATCH", { emailUpdates: next });
    setBusy(false);
    if (!r.ok) return setError(errorOf(r));
    setOn(next);
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <EmailUpdatesBox checked={on} disabled={busy} onChange={(next) => void change(next)} where="here" />
      {saved && <p role="status" className="text-xs text-emerald-300">{on ? "Emails turned on." : "Emails turned off."}</p>}
      <ErrorLine>{error}</ErrorLine>
    </div>
  );
}
