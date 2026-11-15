"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import { ACCOUNT_CHANGED_WORDS, accountHeaders, isAccountChanged } from "@/features/userData/client/accountHeader";

/** One live link, as `GET /api/shares` lists it. */
type Link = { id: string; createdAt: string };

/** Thrown by `prepare` to stop the share; its message is shown in the popover. */
export class ShareRefused extends Error {}

/** Where a share opens: a note's public page, or a plan's invite. */
export const shareHref = (kind: "note" | "plan", id: string): string => (kind === "note" ? `/notes/shared/${id}` : `/plan/invite/${id}`);

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const OFFLINE = "Check your connection, then try again.";

/** The server's own words for a refusal, else the connection line. */
async function refusal(res: Response | null, what: string): Promise<string> {
  const said = res ? ((await res.json().catch(() => null)) as { error?: unknown } | null)?.error : null;
  if (res && isAccountChanged(res.status, { error: said })) return ACCOUNT_CHANGED_WORDS;
  return typeof said === "string" ? said : `${what} ${OFFLINE}`;
}

/**
 * Share as a link: a popover beside the button. **Share** makes a frozen copy of the item now (`POST /api/shares`) and shows its
 * link with **Copy link**; under it are the item's live links (`GET /api/shares?kind=&item=`), each with its date and **Stop**
 * (`DELETE /api/shares/<id>`). In the notes creator it keeps **View as a note** (`onView`).
 *
 * `kind` and `itemId` say what is shared and whose links are listed: a note's item is "note" (the stored note) or "studio"
 * (the studio's stage, sent as `block()`). `prepare` runs before sharing (the notes creator sends its unsaved change first); when it throws, nothing is shared and
 * the popover shows a `ShareRefused`'s message.
 * `instead` replaces Share and the links (the plan page's Upgrade to Teacher account). A plan's live links are dates, not
 * links: opening an invite would add a copy to the sharer's own plans. Closes on ✕, Esc or a press outside it and
 * its button. Drawn on the page (a portal, fixed beside the button; under it on a narrow window), as the side panel scrolls and
 * would clip it.
 */
export default function SharePopover({ open, onClose, onView, kind, itemId = kind === "note" ? "note" : undefined, block, prepare, instead, children }: {
  open: boolean;
  onClose: () => void;
  onView?: () => void;
  kind: "note" | "plan";
  /** the item whose links are listed: "note", "studio", or a plan's id */
  itemId?: string;
  /** the note to share instead of the stored one (the studio's stage) */
  block?: () => unknown;
  prepare?: () => Promise<void>;
  instead?: ReactNode;
  /** the button it belongs to */
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const beside = window.innerWidth >= 768 && r.right + 8 + 288 <= window.innerWidth;
      setAt(beside ? { left: r.right + 8, top: r.top } : { left: Math.max(8, Math.min(r.left, window.innerWidth - 296)), top: r.bottom + 8 });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const inside = (n: Node) => !!box.current?.contains(n) || !!pop.current?.contains(n);
    const down = (e: PointerEvent) => !inside(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open, onClose]);

  const thing = kind === "note" ? "note" : "plan";
  const title = kind === "note" ? "Share this note" : "Share this plan";
  return (
    <div ref={box} className="relative">
      {children}
      {open && at && createPortal(
        <div ref={pop} role="dialog" aria-label={title} style={{ left: at.left, top: at.top }} className="fixed z-[1500] w-72 rounded-xl border border-sky-500/40 bg-slate-900 p-3 shadow-xl shadow-black/40">
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-300">
              <Icon name="share-2" size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sky-100">{title}</p>
              {!instead && (
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {kind === "note"
                    ? "Anyone with the link can read the note, with no login."
                    : "Anyone who opens the link logs in and gets their own copy of the plan. Press Stop to end a link: copies already made stay."}{" "}
                  The link keeps the {thing} as it is now: to send later changes, share it again.
                </p>
              )}
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:text-slate-100">
              <Icon name="x" size={14} />
            </button>
          </div>
          {instead ?? (itemId && <Sharing kind={kind} itemId={itemId} block={block} prepare={prepare} />)}
          {onView && (
            <button type="button" onClick={() => { onClose(); onView(); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
              <Icon name="eye" size={12} /> View as a note
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Share, the new link, and the live links. Mounted while the popover is open, so the list is read afresh each time. */
function Sharing({ kind, itemId, block, prepare }: { kind: "note" | "plan"; itemId: string; block?: () => unknown; prepare?: () => Promise<void> }) {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/shares?kind=${kind}&item=${encodeURIComponent(itemId)}`, { headers: accountHeaders() })
      .then(async (res) => {
        if (!live) return;
        if (!res.ok) return setError(await refusal(res, "Your links could not be loaded."));
        const body = (await res.json()) as { shares?: Link[] };
        setLinks(body.shares ?? []);
      })
      .catch(() => live && setError(`Your links could not be loaded. ${OFFLINE}`));
    return () => {
      live = false;
    };
  }, [kind, itemId]);

  const share = useCallback(async () => {
    setBusy(true);
    setError(null);
    let res: Response | null = null;
    try {
      await prepare?.();
    } catch (e) {
      setError(e instanceof ShareRefused ? e.message : `The ${kind} was not shared. ${OFFLINE}`);
      setBusy(false);
      return;
    }
    try {
      const body = block ? { kind, note: block() } : { kind };
      res = await fetch("/api/shares", { method: "POST", headers: accountHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) });
    } catch {}
    if (res?.ok) {
      const { share: made } = (await res.json()) as { share: Link };
      setFresh(made.id);
      setLinks((l) => [made, ...(l ?? [])]);
    } else setError(await refusal(res, `The ${kind} was not shared.`));
    setBusy(false);
  }, [kind, block, prepare]);

  const stop = useCallback(async (id: string) => {
    setError(null);
    let res: Response | null = null;
    try {
      res = await fetch(`/api/shares/${encodeURIComponent(id)}`, { method: "DELETE", headers: accountHeaders() });
    } catch {}
    // a 404 is a link already stopped (in another tab): it goes from the list as well
    if (res?.ok || res?.status === 404) {
      setLinks((l) => l?.filter((x) => x.id !== id) ?? null);
      if (fresh === id) setFresh(null);
    } else setError(await refusal(res, "The link was not stopped."));
  }, [fresh]);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <button type="button" disabled={busy} onClick={() => void share()} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-60">
        <Icon name="share-2" size={12} /> {busy ? "Sharing…" : "Share"}
      </button>
      {fresh && <NewLink href={shareHref(kind, fresh)} />}
      {error && <p role="alert" className="text-xs leading-relaxed text-amber-300">{error}</p>}
      {links && links.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Live links</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                {/* opening an invite adds a copy to your own plans, so a plan's links are not links here */}
                {kind === "note" ? (
                  <a href={shareHref(kind, l.id)} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sky-300 hover:text-sky-200">Shared {when(l.createdAt)}</a>
                ) : (
                  <span className="min-w-0 truncate text-slate-300">Shared {when(l.createdAt)}</span>
                )}
                <button type="button" onClick={() => void stop(l.id)} className="shrink-0 rounded-md border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-rose-400/60 hover:text-rose-200">Stop</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The link just made, to select or copy. */
function NewLink({ href }: { href: string }) {
  const url = typeof window === "undefined" ? href : new URL(href, window.location.origin).toString();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <input readOnly value={url} aria-label="The new link" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-200" />
      <button type="button" onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})} className="flex items-center justify-center gap-1.5 rounded-md border border-sky-500/50 px-2 py-1 text-xs text-sky-100 hover:border-sky-400">
        <Icon name="copy" size={12} /> {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
