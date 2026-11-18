"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { useAccount } from "@/features/account/useAccount";
import { errorOf, send } from "@/features/account/ui/parts";
import { devUi } from "@/features/devtools/gate";
import { bubblePlacement } from "../model/placement";
import type { MessageContext } from "../model/message";
import { PANEL_ATTR, aboutLine, pageContext, readSelection } from "./pageContext";

type ThreadItem = { id: string; lastAt: string; preview: string; unread: boolean };
type Msg = { fromAdmin: boolean; body: string; at: string };

const THREAD_POLL = 20_000;
const COUNT_POLL = 60_000;
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * The chat bubble: signed-in users only, bottom right, left of the Rec tab and lifted with it over the plan's day
 * timer (`--corner-stack`); higher in development, clear of the dev Notes button. Opens a panel with the user's threads
 * with us. Each message carries where it was sent from (`pageContext`). Hidden where it would cover a tool (`bubblePlacement`).
 */
export default function Bubble() {
  const { account, loaded } = useAccount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const selection = useRef<{ text: string; y: number } | null>(null);
  const [context, setContext] = useState<MessageContext | null>(null);
  const markRead = useCallback(() => setUnread(0), []);
  const show = loaded && !!account && bubblePlacement(pathname) === "show";

  // the dot: on load, then every minute while the tab is visible and the panel is shut
  useEffect(() => {
    if (!show || open) return;
    let live = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      void send("/api/me/messages?count=1", "GET").then((r) => {
        if (live && r.ok && typeof r.body.unread === "number") setUnread(r.body.unread);
      });
    };
    check();
    const id = setInterval(check, COUNT_POLL);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [show, open]);

  if (!show) return null;

  // whole class names, so Tailwind sees them
  const dev = devUi();
  const bottom = dev ? "bottom-[calc(4.5rem+var(--corner-stack,0px))]" : "bottom-[calc(1.5rem+var(--corner-stack,0px))]";
  const panelBottom = dev ? "sm:bottom-[calc(4.5rem+var(--corner-stack,0px))]" : "sm:bottom-[calc(1.5rem+var(--corner-stack,0px))]";
  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label={unread ? "Messages, new reply" : "Messages"}
          title="Message us"
          onPointerDown={() => (selection.current = readSelection())}
          onClick={() => {
            setContext(pageContext(selection.current ?? readSelection()));
            setOpen(true);
          }}
          className={`fixed right-11 ${bottom} z-[2300] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-800/90 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-700 sm:right-12 sm:h-12 sm:w-12`}
        >
          <Icon name="message-circle" size={20} />
          {unread > 0 && <span aria-hidden className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-amber-400" />}
        </button>
      )}
      {open && context && (
        <Panel
          context={context}
          onClose={() => {
            selection.current = null;
            setOpen(false);
          }}
          onRead={markRead}
          position={panelBottom}
        />
      )}
    </>
  );
}

function Panel({ context, onClose, onRead, position }: { context: MessageContext; onClose: () => void; onRead: () => void; position: string }) {
  const [threads, setThreads] = useState<ThreadItem[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [view, setView] = useState<"thread" | "list">("thread");
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const about = aboutLine(context);

  const loadThread = useCallback(async (id: string) => {
    const r = await send(`/api/me/messages?thread=${encodeURIComponent(id)}`, "GET");
    if (!r.ok) return setError(errorOf(r));
    setMessages(r.body.messages as Msg[]);
    const read = await send("/api/me/messages/read", "POST", { threadId: id });
    if (read.ok) setThreads((ts) => ts?.map((t) => (t.id === id ? { ...t, unread: false } : t)) ?? ts);
  }, []);

  // the threads, then the newest one open
  useEffect(() => {
    let live = true;
    void send("/api/me/messages", "GET").then(async (r) => {
      if (!live) return;
      if (!r.ok) return setError(errorOf(r));
      const ts = r.body.threads as ThreadItem[];
      setThreads(ts);
      if (ts[0]) {
        setCurrent(ts[0].id);
        await loadThread(ts[0].id);
        onRead();
      } else setMessages([]);
    });
    return () => {
      live = false;
    };
  }, [loadThread, onRead]);

  // new replies while the panel is open
  useEffect(() => {
    if (!current || view !== "thread") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void loadThread(current);
    }, THREAD_POLL);
    return () => clearInterval(id);
  }, [current, view, loadThread]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("Write a message first.");
    setSending(true);
    setError(null);
    const r = await send("/api/me/messages", "POST", current ? { body: text, context, threadId: current } : { body: text, context, newThread: true });
    setSending(false);
    if (!r.ok) return setError(errorOf(r));
    setText("");
    const id = r.body.threadId as string;
    setCurrent(id);
    await loadThread(id);
  };

  const openThread = async (id: string) => {
    setCurrent(id);
    setView("thread");
    setMessages(null);
    setError(null);
    await loadThread(id);
  };

  const startNew = () => {
    setCurrent(null);
    setView("thread");
    setMessages([]);
    setError(null);
  };

  return (
    <div
      {...{ [PANEL_ATTR]: "" }}
      role="dialog"
      aria-label="Messages"
      className={`fixed inset-0 z-[2300] flex flex-col bg-slate-900 text-slate-100 sm:inset-auto sm:right-12 ${position} sm:h-[min(32rem,calc(100dvh-8rem))] sm:w-96 sm:rounded-2xl sm:border sm:border-slate-700 sm:shadow-2xl`}
    >
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        {view === "list" ? (
          <h2 className="text-sm font-semibold">Your messages</h2>
        ) : (
          <>
            {threads && threads.length > 1 && (
              <button type="button" className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="All messages" onClick={() => setView("list")}>
                <Icon name="chevron-left" size={18} />
              </button>
            )}
            <h2 className="text-sm font-semibold">Message us</h2>
          </>
        )}
        <button type="button" className="ml-auto cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </header>

      {view === "list" ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <button type="button" onClick={startNew} className="m-3 cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
            New message
          </button>
          <ul className="flex flex-col divide-y divide-slate-800">
            {threads?.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => void openThread(t.id)} className="flex w-full cursor-pointer flex-col gap-0.5 px-4 py-3 text-left hover:bg-slate-800/60">
                  <span className="flex items-center gap-2 text-sm">
                    {t.unread && <span aria-label="New reply" className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                    <span className="truncate">{t.preview}</span>
                  </span>
                  <span className="text-xs text-slate-500">{when(t.lastAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages === null && <p className="text-sm text-slate-400">Loading…</p>}
            {messages?.length === 0 && (
              <p className="text-sm text-slate-400">Something unclear, wrong or missing? Tell us here. We read every message and reply in this panel.</p>
            )}
            {messages?.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.fromAdmin ? "self-start bg-slate-800 text-slate-100" : "self-end bg-sky-500/20 text-sky-50"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[11px] text-slate-500">{m.fromAdmin ? "attunr" : "You"} · {when(m.at)}</p>
              </div>
            ))}
            <div ref={end} />
          </div>
          <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3">
            {(about || context.selection) && (
              <p className="text-xs text-slate-500">
                {about && <>Sent with this page: {about}</>}
                {context.selection && <span className="block truncate">Selected text: “{context.selection}”</span>}
              </p>
            )}
            <label htmlFor="message-text" className="sr-only">Your message</label>
            <textarea
              id="message-text"
              rows={3}
              maxLength={4000}
              value={text}
              placeholder="What happened, and where?"
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "message-error" : undefined}
              className="resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            {error && <p id="message-error" role="alert" className="text-xs text-rose-300">{error}</p>}
            <button type="submit" disabled={sending} className="cursor-pointer self-end rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60">
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
