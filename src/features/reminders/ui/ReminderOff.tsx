"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ErrorLine, LINK, PRIMARY, errorOf, send } from "@/features/account/ui/parts";

/** One button that turns reminder emails off; then a line saying where to turn them on again. */
export default function ReminderOff({ token }: { token: string }) {
  const [state, setState] = useState<{ kind: "ready" | "sending" | "done" } | { kind: "error"; error: string }>({ kind: "ready" });
  const stop = async () => {
    setState({ kind: "sending" });
    const r = await send(`/api/reminders/off?token=${encodeURIComponent(token)}`, "POST");
    setState(r.ok ? { kind: "done" } : { kind: "error", error: errorOf(r) });
  };
  if (state.kind === "done")
    return (
      <Card>
        <p role="status" className="text-base text-slate-100">Reminder emails are off.</p>
        <p className="text-sm text-slate-400">
          To turn them on again, tick Email me at on the <Link href="/plan" className={LINK}>Practice plan</Link> page.
        </p>
      </Card>
    );
  return (
    <Card>
      <p className="text-base text-slate-100">Stop the daily email that reminds you to practise?</p>
      <button type="button" className={PRIMARY} onClick={stop} disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Stopping…" : "Stop reminder emails"}
      </button>
      {state.kind === "error" && <ErrorLine>{state.error}</ErrorLine>}
    </Card>
  );
}
