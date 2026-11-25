"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import SharePopover, { ShareRefused } from "@/features/teachers/studio/SharePopover";
import { useAccount } from "@/features/account/useAccount";
import { LabelSelect } from "@/features/theory/useLabelSystem";
import type { Stars } from "@/features/progress/stars";
import type { ProgressEntry } from "@/features/progress/log";
import { randomId } from "../model/exerciseIds";
import { entryFor } from "../model/progressLog";
import { ratePlan } from "../model/schedule";
import type { StoredPlan } from "../model/types";
import { usePlanStore } from "../store/usePlan";

/**
 * The pieces today's plan (`PlanApp`) and a given plan's page (`GivenPlan`) share: the rating handler (`rateHandler`), Share plan and the
 * Labels control. Each page says which plan they act on.
 */

const NOT_SAVED = "Your latest change isn't saved yet, so the plan wasn't shared. Wait a moment, then press Share again.";

/** The header's controls: one height, big enough to hit with a guitar in the other hand. */
export const BIG = "h-10 !rounded-xl px-4 text-sm";

/** The progress log's writers (`useProgress`): the page's own, so the log it reads sees the rating at once. */
type ProgressLog = { put: (entry: ProgressEntry) => void; remove: (exerciseId: string) => void };

/**
 * A rating goes to the plan (what the day draws; `setPlan` stores it where the plan lives) and to the progress log (the
 * lasting record, one row per exercise; the page's `useProgress`), so it counts for the player's steps wherever the plan is.
 */
export function rateHandler(plan: StoredPlan | null, setPlan: (change: (p: StoredPlan) => StoredPlan) => void, progress: ProgressLog) {
  return (d: number, e: number, stars: Stars | null) => {
    const at = new Date().toISOString();
    setPlan((p) => ratePlan(p, d, e, stars, at));
    const id = plan?.config.days[d]?.exercises[e]?.id;
    if (!plan || !id) return;
    const row = stars === null ? null : entryFor(plan, d, e, { stars, at }, randomId);
    if (row) progress.put(row);
    else progress.remove(id);
  };
}

/**
 * Share plan for the plan `planId` (today's own plan, or a given plan): the share popover, which flushes the plan store
 * first (the invite is made from the stored plan, so the latest change has to land); without a teacher account, what one does.
 */
export function SharePlan({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { can } = useAccount();
  const store = usePlanStore();
  const prepare = useCallback(async () => {
    if ((await store.flush?.()) === false) throw new ShareRefused(NOT_SAVED);
  }, [store]);
  return (
    <SharePopover kind="plan" itemId={planId} open={open} onClose={close} prepare={prepare} instead={can("sharePlan") ? undefined : <UpgradeToTeacher />}>
      <Button onClick={() => setOpen((s) => !s)} aria-expanded={open} className={`${BIG} !font-semibold !border-sky-400/70 !text-sky-100 transition hover:!bg-sky-500/15`}><Icon name="share-2" size={16} />Share plan</Button>
    </SharePopover>
  );
}

/** Share plan for a player without a teacher account: what one does, and the teacher offer. */
function UpgradeToTeacher() {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-slate-300">With a teacher account, you share a plan as a link, and each student who opens it gets their own copy to practice.</p>
      <Link href="/kickstarter" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/20 transition hover:bg-sky-400">
        Upgrade to Teacher account
      </Link>
    </div>
  );
}

/**
 * The exercises set their own keys and always count from the scale's root, so the only setting is how notes are labelled:
 * a small pill floating over the day timer (`CornerLabels`), or on a phone a control in the header row (`PhoneLabels`).
 */
export const CornerLabels = () => <LabelSelect className="rounded-xl border border-slate-700 bg-slate-950/90 px-2.5 py-1.5 shadow-xl shadow-black/40 backdrop-blur max-sm:hidden" />;
export const PhoneLabels = () => <LabelSelect className="h-10 rounded-lg border border-slate-700 px-3 sm:hidden" />;
