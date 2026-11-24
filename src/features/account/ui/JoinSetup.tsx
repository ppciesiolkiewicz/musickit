"use client";

import { useRef, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { EmailUpdatesBox } from "./EmailUpdates";
import { ErrorLine, FIELD, LABEL, PRIMARY } from "./parts";

/**
 * A personal invite's setup (`JoinForm`), for a new account that just logged in on `/join/<token>`: its name, email
 * updates and the voice-care box, as on /account/setup but with no plan to pick, since the invite gives one. The terms
 * were agreed under the log-in form. `onSave` joins with the invite; `error` is what the server said.
 */
export default function JoinSetup({ startName, busy, error, onSave }: {
  startName: string;
  busy: boolean;
  error: string | null;
  onSave: (input: { name: string; emailUpdates: boolean }) => void;
}) {
  const [name, setName] = useState(startName);
  const [emails, setEmails] = useState(false);
  const [care, setCare] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [careError, setCareError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const careRef = useRef<HTMLInputElement>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const noName = !name.trim();
    setNameError(noName ? "Please type your name." : null);
    setCareError(care ? null : "Please tick the box about looking after your voice.");
    if (noName) return nameRef.current?.focus();
    if (!care) return careRef.current?.focus();
    onSave({ name, emailUpdates: emails });
  };

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col">
        <label htmlFor="join-name" className={LABEL}>Your name</label>
        <input
          id="join-name"
          ref={nameRef}
          className={FIELD}
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(null); }}
          autoComplete="name"
          autoFocus={!startName}
          maxLength={80}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "join-name-error" : undefined}
        />
        <ErrorLine id="join-name-error">{nameError}</ErrorLine>
      </div>
      <EmailUpdatesBox checked={emails} onChange={setEmails} where="account" />
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-sm">
          <input
            ref={careRef}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400"
            checked={care}
            onChange={(e) => { setCare(e.target.checked); setCareError(null); }}
            aria-invalid={!!careError}
            aria-describedby={careError ? "join-care-error" : undefined}
          />
          <span className="text-slate-200">
            I&apos;ll be gentle with my voice. Singing doesn&apos;t need much force. I&apos;ll stop if I feel pain, discomfort or dizziness, and see a voice teacher or a doctor if I&apos;m worried.
          </span>
        </label>
        <ErrorLine id="join-care-error">{careError}</ErrorLine>
      </div>
      <ErrorLine>{error}</ErrorLine>
      <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Saving…" : <>Continue<Icon name="chevron-right" size={16} /></>}</button>
    </form>
  );
}
