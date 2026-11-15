"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Notice } from "@/components/ui";
import Icon from "@/components/Icon";
import { loginHref } from "@/lib/publicPaths";
import { useSaveAccountChanged, useSaveStatus, useSaveTooBig, useUnsaved } from "./useDataSource";

/**
 * The one save notice, mounted once in the root layout (so every page has it, with or without PageShell). It shows only when a save failed (and is retried), was refused, or the player
 * was logged out, and while
 * anything is unsaved it asks the browser to warn before the page is left.
 */
export default function SaveNotice() {
  const status = useSaveStatus();
  const tooBig = useSaveTooBig();
  const accountChanged = useSaveAccountChanged();
  const unsaved = useUnsaved();

  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  if (status === "saved" || status === "saving") return null;
  const here = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-5 z-[2100] flex justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-slate-950 shadow-lg shadow-black/50">
        <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>
          {status === "failed" ? (
            <>
              <strong className="font-semibold text-slate-100">Not saved yet.</strong> Your last change didn&apos;t reach the server. Keep this page open while the app tries again.
            </>
          ) : status === "rejected" && tooBig ? (
            <>
              <strong className="font-semibold text-slate-100">Not saved: this is too big to save.</strong> The app won&apos;t keep trying. Remove something you added, and the smaller version saves.
            </>
          ) : status === "rejected" && accountChanged ? (
            <>
              <strong className="font-semibold text-slate-100">Not saved: another account is logged in now.</strong> This page is still open from before. Reload it to use the account that is logged in.
            </>
          ) : status === "rejected" ? (
            <>
              <strong className="font-semibold text-slate-100">Not saved.</strong> The server turned down your last change, and the app won&apos;t keep trying. Reload the page, then make your change again.
            </>
          ) : (
            <>
              <strong className="font-semibold text-slate-100">Not saved: you&apos;re logged out.</strong>{" "}
              <Link href={loginHref(here)} className="font-semibold text-slate-100 underline underline-offset-2">Log in</Link>, then make your change again.
            </>
          )}
        </Notice>
      </div>
    </div>
  );
}
