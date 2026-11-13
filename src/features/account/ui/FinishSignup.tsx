"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Card, ErrorLine, FIELD, LABEL, LINK, PRIMARY, errorOf, send } from "./parts";

/**
 * /account/setup: the email is already proven (a log-in link or Google) but has no account. Asks for the one thing
 * still missing, the name (Google's is offered), and makes the account.
 */
export default function FinishSignup({ next }: { next: string | null }) {
  const [email, setEmail] = useState<string | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void send("/api/auth/signup", "GET").then((r) => {
      if (!live) return;
      if (!r.ok) return setGone(errorOf(r));
      setEmail(String(r.body.email ?? ""));
      setName(String(r.body.name ?? ""));
    });
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send("/api/auth/signup", "POST", { name });
    if (r.ok) return window.location.assign(typeof r.body.redirect === "string" ? r.body.redirect : (next ?? "/account"));
    setBusy(false);
    if (r.status === 410) return setGone(errorOf(r));
    setError(errorOf(r));
  };

  if (gone) {
    return (
      <Card>
        <ErrorLine>{gone}</ErrorLine>
        <Link className={`${LINK} text-sm`} href="/login">Log in</Link>
      </Card>
    );
  }
  if (email === null) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;

  return (
    <Card>
      <p className="text-sm text-slate-300">
        There is no account for <strong className="text-slate-100">{email}</strong> yet. Type your name to create it.
      </p>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <label>
          <span className={LABEL}>Name</span>
          <input className={FIELD} autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Creating…" : "Create account"}</button>
      </form>
    </Card>
  );
}
