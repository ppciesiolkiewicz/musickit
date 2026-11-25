"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "@/features/account/useAccount";
import { ErrorLine, FIELD, LABEL, PRIMARY, SECONDARY, errorOf, send } from "@/features/account/ui/parts";

/** The Send feedback page: the profile menu's Send feedback and the beta line on /account link here. */
export const FEEDBACK_HREF = "/feedback";

/**
 * /feedback, signed-in users only (LoginGuard sends others to log in): a message box whose Send feedback starts a new
 * thread with us (`POST /api/me/messages`, `newThread`, source `feedback-page`). We answer at /admin/admin/messages; the answer
 * shows in the chat bubble (`Bubble`).
 */
export default function FeedbackPage() {
  const { account, loaded } = useAccount();
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!loaded || !account) return <p className="text-sm text-slate-400">Loading…</p>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return setError("Write what happened, then press Send feedback.");
    setState("sending");
    setError(null);
    const r = await send("/api/me/messages", "POST", { body: message, context: { source: "feedback-page" }, newThread: true });
    if (!r.ok) {
      setState("idle");
      return setError(errorOf(r));
    }
    setMessage("");
    setState("sent");
  };

  return (
    <section aria-label="Feedback" className="flex max-w-xl flex-col gap-3">
      <p className="text-sm text-slate-400">
        Something broken, confusing or missing? Tell us what happened and on which page. We read every message, and our
        reply shows in Messages, the chat button at the bottom left of the page.
      </p>
      {state === "sent" ? (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-sm text-emerald-300">Feedback sent. Our reply will show in Messages.</p>
          <button type="button" className={`${SECONDARY} sm:w-auto sm:self-start`} onClick={() => setState("idle")}>Send more feedback</button>
        </div>
      ) : (
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
          <label htmlFor="feedback-message" className={`${LABEL} sr-only`}>Your feedback</label>
          <textarea
            id="feedback-message"
            className={`${FIELD} resize-y`}
            rows={6}
            maxLength={4000}
            value={message}
            placeholder="What happened, and on which page?"
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
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
