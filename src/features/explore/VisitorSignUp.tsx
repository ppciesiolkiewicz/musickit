"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { btnBase } from "@/components/ui";
import { THEORY_SECTIONS } from "@/features/theory/sections";
import { loginHref } from "@/lib/publicPaths";
import { accountsOpen } from "@/features/account/serverAccountStore";
import { useAccount } from "@/features/account/useAccount";

/** The sign-up offer, in the user's words: what an account adds to the open tools. */
const OFFER = "More practice tools and daily practice plan";

const CREATE = `${btnBase} border-sky-500/60 bg-sky-500/20 text-sky-50 hover:border-sky-400 hover:bg-sky-500/30`;

/** A few of the tools behind an account, named on the end section. Read from `THEORY_SECTIONS`, so a renamed tool stays in step. */
const LOCKED_HREFS = ["/theory/notes", "/theory/ears", "/theory/backing", "/looper", "/theory/singing", "/theory/drills", "/theory/arpeggios", "/theory/song-chart"];
const LOCKED = LOCKED_HREFS.map((h) => THEORY_SECTIONS.find((s) => s.href === h)).filter((s) => !!s);

/**
 * Someone who isn't signed in, on a site with accounts. False until the session read is done, so a signed-in player
 * never sees the offer flash up.
 */
export function useVisitor(): boolean {
  const { account, loaded } = useAccount();
  return loaded && !account && accountsOpen();
}

/** Create account: logging in makes a new account, and brings the visitor back to this page. */
function CreateAccount({ className = "" }: { className?: string }) {
  const path = usePathname() ?? "/plan";
  return <Link href={loginHref(path)} className={`${CREATE} ${className}`}>Create account</Link>;
}

/** The small offer for an open tool's title row (PageShell's `action`): one line and Create account. Nothing for a signed-in player. */
export function SignUpCorner() {
  if (!useVisitor()) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden whitespace-nowrap text-xs text-slate-400 lg:block">{OFFER}</span>
      <CreateAccount className="shrink-0 whitespace-nowrap" />
    </div>
  );
}

/** The larger offer at the end of an open tool (PageShell's `end`): what an account gives, some of the tools it opens, Create account. */
export function SignUpEnd({ tools = true }: { /** off where the page already shows the locked tools (/explore) */ tools?: boolean }) {
  if (!useVisitor()) return null;
  return (
    <section aria-labelledby="signup-end" className="metal-panel mb-6 rounded-2xl border border-sky-500/30 bg-slate-900/70 p-5 sm:p-7">
      <h2 id="signup-end" className="text-xl font-semibold text-slate-50 sm:text-2xl">{OFFER}</h2>
      <p className="mt-2 max-w-2xl text-slate-300">
        With an account you get a daily practice plan made for your level and your time, plus every tool, lesson and drill in attunr.
      </p>
      {tools && (
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Some of the tools with an account">
        {LOCKED.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100">
              <Icon name="lock" size={13} className="text-slate-500" />
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
      )}
      <CreateAccount className="mt-5" />
    </section>
  );
}

/** Its children only for a visitor (the nav's Explore link), nothing for a signed-in player. */
export function VisitorOnly({ children }: { children: ReactNode }) {
  return useVisitor() ? <>{children}</> : null;
}
