"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { Button } from "@/components/ui";
import { CHOICE_EVENT, browserState, countingNow, mayCount, mustAsk, saveChoice, scrubUrl } from "@/lib/analyticsChoice";

/*
 * The visitor's say over counting (the rules are in lib/analyticsChoice.ts, the promise on /privacy):
 * `SiteAnalytics` is Vercel Analytics held to it, `AnalyticsAsk` the question a visitor in the EU gets first, and
 * `AnalyticsSwitch` the control on /privacy. PostHog is held to it in instrumentation-client.ts.
 */

/** PostHog starts once a page, without a cookie, and can't be stopped again: a new answer takes a fresh page load. */
const reload = () => window.location.reload();

type View = "server" | "ask" | "on" | "off" | "off-gpc";

const view = (): View => {
  const s = browserState();
  if (!s) return "server";
  if (mustAsk(s)) return "ask";
  if (mayCount(s)) return "on";
  return s.gpc && !s.choice ? "off-gpc" : "off";
};

const subscribe = (changed: () => void) => {
  window.addEventListener(CHOICE_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(CHOICE_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
};

const useView = (): View => useSyncExternalStore(subscribe, view, () => "server");

const answer = (choice: "on" | "off") => {
  // a browser that won't keep the answer is not counted and is asked again next time: nothing to reload for
  if (saveChoice(choice)) reload();
};

/** Vercel Analytics: nothing is sent for a visitor who isn't counted, and an address loses its tokens first. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(e: BeforeSendEvent) => (countingNow() ? { ...e, url: scrubUrl(e.url) } : null)} />;
}

/** The question, once, at the bottom of the page, for a visitor who must be asked first. Mounted in the root layout. */
export function AnalyticsAsk() {
  if (useView() !== "ask") return null;
  return (
    <div role="region" aria-label="Counting visits" className="fixed inset-x-0 bottom-5 z-[2000] flex justify-center px-4">
      <div className="metal-panel flex w-full max-w-md flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-300 shadow-lg shadow-black/50">
        <p>
          <strong className="font-semibold text-slate-100">May we count your visits?</strong> We count which pages and tools are used, so we know what to fix. No cookies, and never your name or email. The{" "}
          <Link href="/privacy#how-we-count-use" className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">privacy policy</Link> has the details.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => answer("off")}>Don&apos;t count</Button>
          <Button onClick={() => answer("on")}>Count my visits</Button>
        </div>
      </div>
    </div>
  );
}

/** On /privacy: what this browser is set to, and the button that changes it. */
export function AnalyticsSwitch() {
  const v = useView();
  if (v === "server") return null;
  const on = v === "on";
  return (
    <div className="metal-panel flex flex-col items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p role="status">
        {on
          ? "Visits from this browser are counted."
          : v === "off-gpc"
            ? "Visits from this browser are not counted, because your browser sends Global Privacy Control."
            : "Visits from this browser are not counted."}
      </p>
      <Button onClick={() => answer(on ? "off" : "on")}>{on ? "Don't count" : "Count my visits"}</Button>
    </div>
  );
}
