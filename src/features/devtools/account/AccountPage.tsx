"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Select } from "@/components/ui";
import { FEATURES, ROLES, ROLE_LABEL, can, type Account, type AccountError, type Feature, type Role } from "@/features/account/model";
import { accountsOn, localAccountStore } from "@/features/account/localAccountStore";

const FIELD = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-2 focus-visible:outline-sky-400";
const LABEL = "mb-1 block text-xs font-medium text-slate-400";
const BLOCK = "rounded-xl border border-slate-800 bg-slate-900/40 p-4";

const ERRORS: Record<AccountError, string> = {
  name: "Type a name.",
  email: "Type an email address, like ann@school.com.",
  taken: "This email already has an account. Log in to it in the list below.",
};

const FEATURE_LABEL: Record<Feature, string> = { notesCreator: "Notes creator", aiPlan: "AI plan" };

/** After signing in or out every page has to read its data again, from the other account's keys. */
const reload = () => window.location.reload();

/** /dev/account: make accounts, log in to one, log out. Development only; accounts are kept in this browser, with no passwords. */
export default function AccountPage() {
  const store = accountsOn() ? localAccountStore : null;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [current, setCurrent] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState<AccountError | null>(null);

  const refresh = useCallback(async () => {
    if (!store) return;
    const [list, me] = await Promise.all([store.list(), store.current()]);
    setAccounts(list);
    setCurrent(me);
    setLoaded(true);
  }, [store]);

  useEffect(() => {
    if (!store) return;
    let live = true;
    void Promise.all([store.list(), store.current()]).then(([list, me]) => {
      if (!live) return;
      setAccounts(list);
      setCurrent(me);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [store]);

  if (!store) return null;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const result = await store.create({ name, email, role });
    if (!result.ok) return setError(result.error);
    setError(null);
    setName("");
    setEmail("");
    await refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className={BLOCK}>
        <h2 className="text-base font-semibold text-slate-100">Who is using the app</h2>
        {!loaded ? null : current ? (
          <>
            <p className="mt-1 text-sm text-slate-300">
              Logged in as <strong className="text-slate-100">{current.name}</strong> ({ROLE_LABEL[current.role]}, {current.email}). Plans and progress are this account&apos;s own.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {(Object.keys(FEATURES) as Feature[]).map((f) => (
                <li key={f} className={`rounded-md border px-2 py-1 ${can(current, f) ? "border-emerald-500/40 text-emerald-200" : "border-slate-700 text-slate-500"}`}>
                  {FEATURE_LABEL[f]}: {can(current, f) ? "allowed" : "not allowed"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">No screen checks these yet.</p>
            <Button className="mt-3" onClick={() => void store.signOut().then(reload)}>Log out</Button>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-300">
            Nobody is logged in. The app works as it does for a visitor: every tool is open, and plans and progress are the ones shared by this browser.
          </p>
        )}
      </section>

      <section className={BLOCK}>
        <h2 className="text-base font-semibold text-slate-100">Accounts</h2>
        <p className="mb-3 text-xs text-slate-400">Kept in this browser only. There are no passwords: Log in picks the account.</p>
        {loaded && !accounts.length ? (
          <p className="text-sm text-slate-500">No accounts yet. Create one below.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-800">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="font-medium text-slate-100">{a.name}</span>
                <span className="text-slate-400">{ROLE_LABEL[a.role]}</span>
                <span className="text-slate-500">{a.email}</span>
                <span className="ml-auto flex gap-2">
                  {current?.id === a.id ? (
                    <span className="self-center text-xs text-emerald-300">Logged in</span>
                  ) : (
                    <Button size="sm" onClick={() => void store.signIn(a.id).then(reload)}>Log in</Button>
                  )}
                  <Button
                    size="sm"
                    aria-label={`Delete account ${a.name}`}
                    onClick={() => void store.remove(a.id).then(() => (current?.id === a.id ? reload() : refresh()))}
                  >
                    Delete account
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={BLOCK}>
        <h2 className="mb-3 text-base font-semibold text-slate-100">Create account</h2>
        <form noValidate onSubmit={(e) => void create(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label>
            <span className={LABEL}>Name</span>
            <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </label>
          <label>
            <span className={LABEL}>Email</span>
            <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </label>
          <div>
            <span className={LABEL}>Role</span>
            <Select<Role> aria-label="Role" size="md" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          </div>
          <Button type="submit">Create account</Button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-rose-300">{ERRORS[error]}</p>}
        <p className="mt-2 text-xs text-slate-500">Creating an account does not log it in. Deleting one also deletes its plans and progress.</p>
      </section>
    </div>
  );
}
