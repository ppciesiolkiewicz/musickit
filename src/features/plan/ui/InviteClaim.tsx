"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button, btn } from "@/components/ui";
import { loginHref } from "@/lib/publicPaths";
import { accountHeaders } from "@/features/userData/client/accountHeader";
import { givenHref } from "./GivenPlans";

type State = "claiming" | "stopped" | "not-found" | "failed";

const NOTICES: Record<Exclude<State, "claiming">, { title: string; text: string }> = {
  stopped: { title: "This invite was stopped", text: "The teacher who shared the plan stopped this link. Ask them to share the plan again." },
  "not-found": { title: "This invite link doesn't work", text: "The link may be wrong or cut short. Check it, or ask your teacher to send it again." },
  failed: { title: "The plan was not added", text: "Check your connection, then press Try again." },
};

/**
 * A plan invite, opened by a signed-in person (`/plan/invite/<id>`): claims it (`POST /api/shares/<id>/claim`) and, once the
 * copy is in their given plans, loads its page, `/plan/given/<planId>`, afresh so the plan store reads the new document. A stopped or unknown invite shows a
 * notice; a lost session goes to log in and comes back here.
 */
export default function InviteClaim({ id }: { id: string }) {
  const [state, setState] = useState<State>("claiming");
  const sent = useRef(false);

  const claim = useCallback(async () => {
    setState("claiming");
    let res: Response | null = null;
    try {
      res = await fetch(`/api/shares/${encodeURIComponent(id)}/claim`, { method: "POST", headers: accountHeaders(), signal: AbortSignal.timeout(15_000) });
    } catch {}
    if (res?.ok) {
      const { planId } = ((await res.json().catch(() => null)) ?? {}) as { planId?: unknown };
      // a full page load, never a client navigation: the plan store is per session and keeps the document it read
      return window.location.replace(typeof planId === "string" ? givenHref(planId) : "/plan");
    }
    if (res?.status === 401) return window.location.replace(loginHref(window.location.pathname));
    setState(res?.status === 410 ? "stopped" : res?.status === 404 ? "not-found" : "failed");
  }, [id]);

  useEffect(() => {
    // once per page: a claim twice adds nothing, but there is no need to ask twice
    if (sent.current) return;
    sent.current = true;
    void claim();
  }, [claim]);

  if (state === "claiming") return <p role="status" className="text-center text-sm text-slate-400">Adding the plan to your plans…</p>;
  const notice = NOTICES[state];
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <h2 className="text-lg text-slate-100">{notice.title}</h2>
      <p className="text-sm leading-relaxed text-slate-400">{notice.text}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {state === "failed" && <Button onClick={() => void claim()}><Icon name="rotate-ccw" size={14} /> Try again</Button>}
        <Link href="/plan" className={btn}><Icon name="chevron-left" size={14} /> Open AI autoplan</Link>
      </div>
    </div>
  );
}
