"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ROLE_LABEL } from "../model";
import { hasSessionHint } from "../serverAccountStore";
import { useAccount, useAccountStore } from "../useAccount";
import { Card, ErrorLine, FIELD, LABEL, LINK, PRIMARY, SECONDARY, errorOf, send } from "./parts";

/** After anything that changes who is signed in, every page reads its data again. */
const go = (path: string) => window.location.assign(path);

/** /account: who is logged in, their name, Log out and Delete account. Logged out, it points to the two ways in. */
export default function AccountPanel() {
  const { account, loaded } = useAccount();
  const store = useAccountStore();
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loaded) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;

  if (!account) {
    return (
      <Card>
        <p className="text-sm text-slate-300">You are not logged in. Every tool works without an account, and what you do is kept in this browser.</p>
        <Link href="/login" className={PRIMARY}>Log in</Link>
        <Link href="/register" className={SECONDARY}>Create account</Link>
      </Card>
    );
  }

  /** An account picked on /dev/account lives in this browser: the server knows nothing of it, so it can't be changed here. */
  const real = hasSessionHint();
  const shown = name ?? account.name;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const r = await send("/api/account", "PATCH", { name: shown });
    setBusy(false);
    if (!r.ok) return setError(errorOf(r));
    setError(null);
    setSaved(true);
  };

  const remove = async () => {
    setBusy(true);
    const r = await send("/api/account", "DELETE");
    if (r.ok) return go("/");
    setBusy(false);
    setError(errorOf(r));
  };

  return (
    <Card>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Email</dt>
        <dd className="truncate text-slate-100">{account.email}</dd>
        <dt className="text-slate-500">Role</dt>
        <dd className="text-slate-100">{ROLE_LABEL[account.role]}</dd>
      </dl>

      {real ? (
        <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-2">
          <label>
            <span className={LABEL}>Name</span>
            <input className={FIELD} value={shown} onChange={(e) => { setName(e.target.value); setSaved(false); }} autoComplete="name" maxLength={80} />
          </label>
          <button type="submit" disabled={busy || shown.trim() === account.name} className={SECONDARY}>Save name</button>
          {saved && <p role="status" className="text-xs text-emerald-300">Name saved.</p>}
        </form>
      ) : (
        <p className="text-xs text-slate-500">
          {account.name} is a development account kept in this browser. Change it on <Link className={LINK} href="/dev/account">/dev/account</Link>.
        </p>
      )}

      <p className="text-xs text-slate-500">Your plans and progress are still kept in this browser, not in your account.</p>
      <ErrorLine>{error}</ErrorLine>

      <button type="button" disabled={busy} className={SECONDARY} onClick={() => void store.signOut().then(() => go("/"))}>Log out</button>

      {real &&
        (asking ? (
          <div className="flex flex-col gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
            <p className="text-sm text-rose-100">Delete the account for {account.email}? This can&apos;t be undone.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} className={SECONDARY} onClick={() => setAsking(false)}>Keep account</button>
              <button type="button" disabled={busy} className={`${SECONDARY} !border-rose-500/60 !text-rose-100`} onClick={() => void remove()}>Delete account</button>
            </div>
          </div>
        ) : (
          <button type="button" className="self-start text-xs text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline" onClick={() => setAsking(true)}>Delete account</button>
        ))}
    </Card>
  );
}
