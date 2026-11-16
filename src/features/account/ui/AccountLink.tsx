"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { accountsOpen } from "../serverAccountStore";
import { homePage } from "../model";
import { FEEDBACK_HREF } from "./FeedbackForm";
import { useAccount, useAccountStore } from "../useAccount";

const PILL =
  "flex h-8 max-w-[10rem] items-center gap-1.5 rounded-full border border-sky-500/45 bg-sky-500/15 px-2 text-sm sm:pl-2.5 sm:pr-3.5 font-medium text-sky-50 backdrop-blur transition hover:border-sky-400 hover:bg-sky-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const ITEM = "block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 focus-visible:bg-slate-800 focus-visible:outline-none";

/**
 * The account corner of the top nav: "Log in" for a visitor; for a logged-in person, their name, which opens a menu
 * (Your profile, Home page, Log out) on hover, or on a tap or Enter where there is no hover.
 * Nothing at all on a site without accounts, and nothing until we know who is here, so the bar never shows the wrong one.
 */
export default function AccountLink({ className = "" }: { className?: string }) {
  const { account, loaded } = useAccount();
  const store = useAccountStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // a mouse opened the menu on hover already, so its click keeps it open; a tap or Enter opens and closes it
  const pointer = useRef("");

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!loaded || (!account && !accountsOpen())) return null;

  if (!account) {
    return (
      <Link href="/login" aria-label="Log in" className={`${PILL} ${className}`}>
        <Icon name="circle-user-round" size={16} className="shrink-0 text-sky-300" />
        <span className="hidden truncate sm:inline">Log in</span>
      </Link>
    );
  }

  return (
    <div
      ref={box}
      className={`relative ${className}`}
      // a mouse only: a tap also fires pointerenter, and the click right after would close the menu again
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Your account: ${account.name}`}
        onPointerDown={(e) => void (pointer.current = e.pointerType)}
        onClick={() => {
          setOpen((o) => (pointer.current === "mouse" ? true : !o));
          pointer.current = "";
        }}
        className={PILL}
      >
        <Icon name="circle-user-round" size={16} className="shrink-0 text-sky-300" />
        <span className="hidden truncate sm:inline">{account.name}</span>
      </button>
      {open && (
        // pt-1 instead of a margin, so the pointer crosses no gap on the way down
        <div className="absolute right-0 top-full z-50 pt-1">
          <div role="menu" className="w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
            <Link role="menuitem" href="/account" className={ITEM} onClick={() => setOpen(false)}>Your profile</Link>
            {/* the music-school page for a teacher or owner, the players page for a student */}
            <Link role="menuitem" href={homePage(account)} className={ITEM} onClick={() => setOpen(false)}>Home page</Link>
            <Link role="menuitem" href={FEEDBACK_HREF} className={ITEM} onClick={() => setOpen(false)}>Send feedback</Link>
            <button role="menuitem" type="button" className={ITEM} onClick={() => void store.signOut().then(() => window.location.assign("/"))}>Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}
