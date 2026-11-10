"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { SignupRole } from "../model";
import { Card, ErrorLine, FIELD, LABEL, LINK, PRIMARY, RoleChoice, errorOf, send } from "./parts";

/**
 * /register/finish: the email is already proven (a log-in link or Google) but has no account. Asks for the two
 * things still missing, the name and the role, and makes the account.
 */
export default function FinishSignup({ next }: { next: string | null }) {
  const [email, setEmail] = useState<string | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<SignupRole | null>(null);
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
    const r = await send("/api/auth/signup", "POST", { name, role });
    if (r.ok) return window.location.assign(typeof r.body.redirect === "string" ? r.body.redirect : (next ?? "/account"));
    setBusy(false);
    if (r.status === 410) return setGone(errorOf(r));
    setError(errorOf(r));
  };

  if (gone) {
    return (
      <Card>
        <ErrorLine>{gone}</ErrorLine>
        <Link className={`${LINK} text-sm`} href="/register">Create account</Link>
      </Card>
    );
  }
  if (email === null) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;

  return (
    <Card>
      <p className="text-sm text-slate-300">
        There is no account for <strong className="text-slate-100">{email}</strong> yet. Two more things and it is made.
      </p>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <RoleChoice value={role} onChange={setRole} />
        <label>
          <span className={LABEL}>Name</span>
          <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Creating…" : "Create account"}</button>
      </form>
    </Card>
  );
}
