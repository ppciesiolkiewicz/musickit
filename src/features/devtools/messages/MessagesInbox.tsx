"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessageContext } from "@/features/messages/model/message";

type Listed = {
  id: string;
  userId: string | null;
  email: string | null;
  status: "open" | "closed";
  lastAt: string;
  userEmail: string | null;
  userName: string | null;
  preview: string;
  unread: boolean;
};
type Msg = { id: string; fromAdmin: boolean; body: string; context: MessageContext | null; at: string };
type Filter = "open" | "closed" | "all";

const BTN = "inline-flex cursor-pointer items-center rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";
const PRIMARY = "inline-flex cursor-pointer items-center rounded-lg border border-amber-400/70 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-50";
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "content-type": "application/json" }, ...init });
    return { ok: res.ok, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, body: { error: "Couldn't reach the dev server." } };
  }
}
const errorIn = (r: { body: Record<string, unknown> }) => (typeof r.body.error === "string" ? r.body.error : "Something went wrong.");

/** Where a message was sent from, small under it. */
function Context({ c }: { c: MessageContext }) {
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
      {c.path && (
        <a href={c.path} target="_blank" rel="noreferrer" className="font-mono text-sky-400 hover:underline">
          {c.path}
        </a>
      )}
      {c.title && <span>Title: {c.title}</span>}
      {c.under && <span>Under: {c.under.join(" › ")}</span>}
      {c.ref && <span>About: {c.ref}</span>}
      {c.source && <span>From: {c.source}</span>}
      {c.email && <span>Email typed: {c.email}</span>}
      {c.selection && <blockquote className="border-l-2 border-slate-600 pl-2 italic text-slate-400">{c.selection}</blockquote>}
    </div>
  );
}

/** /dev/messages: every thread and contact message, one open beside the list, with reply and close. */
export default function MessagesInbox({ initialThread }: { initialThread: string | null }) {
  const [filter, setFilter] = useState<Filter>(initialThread ? "all" : "open");
  const [threads, setThreads] = useState<Listed[] | null>(null);
  const [selected, setSelected] = useState<string | null>(initialThread);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const r = await call(`/api/dev/messages?status=${filter}`);
    if (!r.ok) return setError(errorIn(r));
    setThreads(r.body.threads as Listed[]);
  }, [filter]);

  const loadThread = useCallback(async (id: string) => {
    const r = await call(`/api/dev/messages?thread=${encodeURIComponent(id)}`);
    if (!r.ok) return setError(errorIn(r));
    setMessages(r.body.messages as Msg[]);
  }, []);

  useEffect(() => {
    let live = true;
    void call(`/api/dev/messages?status=${filter}`).then((r) => {
      if (!live) return;
      if (r.ok) setThreads(r.body.threads as Listed[]);
      else setError(errorIn(r));
    });
    return () => {
      live = false;
    };
  }, [filter]);

  // the thread named in the URL (the email links here), once
  useEffect(() => {
    if (!initialThread) return;
    void call(`/api/dev/messages?thread=${encodeURIComponent(initialThread)}`).then((r) => {
      if (r.ok) setMessages(r.body.messages as Msg[]);
      else setError(errorIn(r));
    });
  }, [initialThread]);

  const open = async (id: string) => {
    setSelected(id);
    setMessages(null);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", id);
    window.history.replaceState(null, "", url);
    await loadThread(id);
    await loadList();
  };

  const current = threads?.find((t) => t.id === selected) ?? null;

  const send = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError(null);
    const r = await call("/api/dev/messages", { method: "POST", body: JSON.stringify({ threadId: selected, body: reply }) });
    setBusy(false);
    if (!r.ok) return setError(errorIn(r));
    setReply("");
    await loadThread(selected);
    await loadList();
  };

  const setStatus = async (status: "open" | "closed") => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const r = await call("/api/dev/messages", { method: "PATCH", body: JSON.stringify({ threadId: selected, status }) });
    setBusy(false);
    if (!r.ok) return setError(errorIn(r));
    await loadList();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["open", "closed", "all"] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? PRIMARY : BTN} onClick={() => setFilter(f)}>
            {f === "open" ? "Open" : f === "closed" ? "Closed" : "All"}
          </button>
        ))}
        <button type="button" className={BTN} onClick={() => void loadList()}>Refresh</button>
        {error && <span role="alert" className="text-xs text-rose-300">{error}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ul className="flex flex-col divide-y divide-slate-800 rounded-lg border border-slate-800">
          {threads === null && <li className="p-3 text-sm text-slate-400">Loading…</li>}
          {threads?.length === 0 && <li className="p-3 text-sm text-slate-400">No {filter === "all" ? "" : `${filter} `}messages.</li>}
          {threads?.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => void open(t.id)} className={`flex w-full cursor-pointer flex-col gap-0.5 p-3 text-left hover:bg-slate-800/60 ${t.id === selected ? "bg-slate-800/80" : ""}`}>
                <span className="flex items-center gap-2 text-sm text-slate-200">
                  {t.unread && <span aria-label="unread" className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                  <span className="truncate font-medium">{t.userName ?? t.email ?? "?"}</span>
                  {!t.userId && <span className="rounded bg-slate-700 px-1.5 text-[10px] uppercase text-slate-300">contact</span>}
                  {t.status === "closed" && <span className="rounded bg-slate-800 px-1.5 text-[10px] uppercase text-slate-500">closed</span>}
                  <span className="ml-auto shrink-0 text-xs text-slate-500">{when(t.lastAt)}</span>
                </span>
                <span className="truncate text-xs text-slate-400">{t.preview}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex min-h-64 flex-col gap-3 rounded-lg border border-slate-800 p-3">
          {!selected && <p className="text-sm text-slate-400">Pick a message on the left.</p>}
          {selected && (
            <>
              <header className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="font-medium">{current?.userName ?? current?.email ?? ""}</span>
                {current?.userEmail && <span className="text-xs text-slate-500">{current.userEmail}</span>}
                {current && (
                  <button type="button" className={`${BTN} ml-auto`} disabled={busy} onClick={() => void setStatus(current.status === "open" ? "closed" : "open")}>
                    {current.status === "open" ? "Close" : "Reopen"}
                  </button>
                )}
              </header>
              {messages === null && <p className="text-sm text-slate-400">Loading…</p>}
              <ol className="flex flex-col gap-3">
                {messages?.map((m) => (
                  <li key={m.id} className={`rounded-lg p-2 text-sm ${m.fromAdmin ? "ml-8 bg-sky-500/10 text-sky-100" : "mr-8 bg-slate-800/70 text-slate-100"}`}>
                    <div className="mb-1 text-xs text-slate-500">{m.fromAdmin ? "Us" : "Them"} · {when(m.at)}</div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {m.context && <Context c={m.context} />}
                  </li>
                ))}
              </ol>
              {current && !current.userId ? (
                <a className={`${BTN} self-start`} href={`mailto:${current.email ?? ""}?subject=${encodeURIComponent("Re: your message to attunr")}`}>Answer by email</a>
              ) : (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                  <textarea className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100" rows={3} maxLength={4000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" />
                  <button type="submit" className={`${PRIMARY} self-start`} disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
