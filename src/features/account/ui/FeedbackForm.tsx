"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Account } from "../model";
import { ErrorLine, FIELD, LABEL, PRIMARY, SECONDARY, errorOf, send } from "./parts";

/** Where the feedback form is: the profile menu's Send feedback and the beta line on /account link here. */
export const FEEDBACK_HREF = "/account#feedback";

/**
 * The Feedback part of /account, for the open beta: a message about what broke or didn't make sense. Sent by
 * `POST /api/contact` with source `beta-feedback` (emailed to `CONTACT_TO_EMAIL` and/or kept as a blob), with the
 * account's email to reply to. The page fills in after the account loads, so a visit to `#feedback` is scrolled here by
 * hand.
 */
export default function FeedbackForm({ account }: { account: Account }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.location.hash === "#feedback") box.current?.scrollIntoView({ block: "start" });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return setError("Write what happened, then press Send feedback.");
    setState("sending");
    setError(null);
    const r = await send("/api/contact", "POST", { email: account.email, message, source: "beta-feedback" });
    if (!r.ok) {
      setState("idle");
      return setError(errorOf(r));
    }
    setMessage("");
    setState("sent");
  };

  return (
    <section ref={box} id="feedback" aria-labelledby="feedback-heading" className="flex scroll-mt-24 flex-col gap-2">
      <h2 id="feedback-heading" className="text-sm font-semibold text-slate-200">Feedback</h2>
      <p className="text-xs text-slate-500">
        Something broken, confusing or missing? Tell us what happened and on which page. We read every message and reply
        to {account.email} if we have a question.
      </p>
      {state === "sent" ? (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-xs text-emerald-300">Feedback sent. Thank you.</p>
          <button type="button" className={`${SECONDARY} sm:w-auto sm:self-start`} onClick={() => setState("idle")}>Send more feedback</button>
        </div>
      ) : (
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
          <label htmlFor="feedback-message" className={`${LABEL} sr-only`}>Your feedback</label>
          <textarea
            id="feedback-message"
            className={`${FIELD} resize-y`}
            rows={4}
            maxLength={4000}
            value={message}
            placeholder="What happened, and on which page?"
            onChange={(e) => { setMessage(e.target.value); setError(null); }}
            aria-invalid={!!error}
            aria-describedby={error ? "feedback-error" : undefined}
          />
          <ErrorLine id="feedback-error">{error}</ErrorLine>
          <button type="submit" disabled={state === "sending"} className={`${PRIMARY} sm:w-auto sm:self-start sm:px-8`}>
            {state === "sending" ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </section>
  );
}
