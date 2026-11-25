"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { inviteEmail, type InviteKind } from "@/features/account/emailHtml";
import { PERSONAL_DEMO_PLAN_ID } from "@/features/account/plans";

type Invite = {
  id: string;
  planId: string;
  note: string;
  /** The `/join/<token>` link; null for invites made before links were kept. */
  link: string | null;
  createdAt: string;
  claimedBy: { id: string; email: string; name: string } | null;
  claimedAt: string | null;
};

const BTN = "inline-flex cursor-pointer items-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";
const PRIMARY = "inline-flex cursor-pointer items-center rounded-lg border border-amber-400/70 bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-50";
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");
const kindOf = (i: Pick<Invite, "planId">): InviteKind => (i.planId === PERSONAL_DEMO_PLAN_ID ? "personal" : "teacher");
const KINDS: { kind: InviteKind; label: string; about: string }[] = [
  { kind: "teacher", label: "Teacher", about: "The link puts whoever opens it on the Teacher Demo plan: 2 students, free, not offered anywhere else." },
  { kind: "personal", label: "Personal", about: "The link puts whoever opens it on the Personal Demo plan: their own practice plans, free, not offered anywhere else. They set up their account, then go to their plan." },
];

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "content-type": "application/json" }, ...init });
    return { ok: res.ok, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, body: { error: "Couldn't reach the server." } };
  }
}
const errorIn = (r: { body: Record<string, unknown> }) => (typeof r.body.error === "string" ? r.body.error : "Something went wrong.");

/**
 * /admin/admin/invites: make an invite, copy its link, and see who joined with each. A teacher invite gives the Teacher Demo
 * plan (2 students, free, never offered); a personal invite the Personal Demo plan (a player's own, free, never offered). Each row's Copy link copies its link again (not for invites made before links were kept), and
 * Copy email copies the invite email (`inviteEmail`) to paste into a mail program: as HTML, so it pastes drawn, and as its
 * source for a plain-text box.
 */
export default function InvitesAdmin() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<InviteKind>("teacher");
  const [made, setMade] = useState<{ link: string; note: string; kind: InviteKind } | null>(null);
  /** What was copied last: the new invite ("made") or an invite's id, then ":link" or ":email". */
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = useCallback((r: Awaited<ReturnType<typeof call>>) => {
    if (r.ok) setInvites(r.body.invites as Invite[]);
    else setError(errorIn(r));
  }, []);
  const load = useCallback(() => call("/api/admin/invites").then(show), [show]);

  useEffect(() => {
    let live = true;
    void call("/api/admin/invites").then((r) => live && show(r));
    return () => void (live = false);
  }, [show]);

  const make = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await call("/api/admin/invites", { method: "POST", body: JSON.stringify({ note, kind }) });
    setBusy(false);
    if (!r.ok) return setError(errorIn(r));
    setMade({ link: String(r.body.link), note, kind });
    setCopied(null);
    setNote("");
    void load();
  };

  const copy = async (link: string, which: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(`${which}:link`);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  };

  const copyEmail = async (link: string, which: string, k: InviteKind) => {
    setError(null);
    const { html } = inviteEmail(link, k);
    try {
      if (typeof ClipboardItem === "undefined") await navigator.clipboard.writeText(html);
      else await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([html], { type: "text/plain" }) })]);
      setCopied(`${which}:email`);
    } catch {
      setError("Couldn't copy the email. Copy the link instead and write the email by hand.");
    }
  };

  const copyButtons = (link: string, which: string, k: InviteKind) => (
    <>
      <button type="button" onClick={() => void copy(link, which)} className={BTN}>{copied === `${which}:link` ? "Copied" : "Copy link"}</button>
      <button type="button" onClick={() => void copyEmail(link, which, k)} className={BTN} title="The invite email, to paste into your mail program">{copied === `${which}:email` ? "Copied" : "Copy email"}</button>
    </>
  );

  const remove = async (id: string) => {
    setError(null);
    const r = await call(`/api/admin/invites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return setError(errorIn(r));
    void load();
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => void make(e)} className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-slate-900/60 p-4">
        <div>
          <h2 className="font-semibold text-amber-200">New invite</h2>
          <p className="mt-1 text-sm text-slate-400">
            {KINDS.find((k) => k.kind === kind)?.about} One link, one account.
          </p>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-medium text-slate-400">Invite for</legend>
          <div className="mt-1 flex gap-2">
            {KINDS.map((k) => (
              <label key={k.kind} className={`${BTN} has-[:checked]:border-amber-400/70 has-[:checked]:bg-amber-500/20 has-[:checked]:text-amber-50`}>
                <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="sr-only" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-400">
          Who it&apos;s for
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            placeholder="Name, school or email, for your own list"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </label>
        <div>
          <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Making the link…" : "Make invite link"}</button>
        </div>
        {made && (
          <div role="status" className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <span className="text-emerald-100">{made.kind === "personal" ? "Personal" : "Teacher"} invite link for {made.note || (made.kind === "personal" ? "a player" : "a teacher")}. You can copy it again from the list below.</span>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly value={made.link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-slate-100" />
              {copyButtons(made.link, "made", made.kind)}
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-slate-200">Invites</h2>
        {!invites && !error && <p className="text-sm text-slate-500">Loading invites…</p>}
        {invites?.length === 0 && <p className="text-sm text-slate-500">No invites yet. Make one above to send to a teacher or a player.</p>}
        {invites && invites.length > 0 && (
          <ul className="flex flex-col divide-y divide-slate-800 rounded-xl border border-slate-800">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 text-slate-200">{i.note || <span className="text-slate-500">No name</span>}</span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">{kindOf(i) === "personal" ? "Personal" : "Teacher"}</span>
                <span className="text-xs text-slate-500">Made {when(i.createdAt)}</span>
                {i.claimedBy ? (
                  <span className="text-xs text-emerald-300">Joined {i.claimedAt ? when(i.claimedAt) : ""}: {i.claimedBy.name} ({i.claimedBy.email})</span>
                ) : i.claimedAt ? (
                  <span className="text-xs text-slate-400">Joined, account deleted</span>
                ) : (
                  <span className="text-xs text-amber-300">Not used yet</span>
                )}
                {i.link ? (
                  copyButtons(i.link, i.id, kindOf(i))
                ) : (
                  <span className="text-xs text-slate-500" title="Made before links were saved">Link not saved</span>
                )}
                <button type="button" onClick={() => void remove(i.id)} className={BTN}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
