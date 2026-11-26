"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Chip, ChipRow } from "@/components/ui";
import type { LabelSystem } from "@/features/theory/labels";
import { FixedLabelSystem } from "@/features/theory/useLabelSystem";
import { NAMES_ARTICLE } from "../model";

/** The two ways a page with a `labels` block can label its dots, as the Labels setting names them. */
const CHOICES = [{ id: "interval", label: "Intervals" }, { id: "solfege", label: "Solfège" }] as const satisfies readonly { id: LabelSystem; label: string }[];

const Choice = createContext<{ initial: LabelSystem; value: LabelSystem; set: (v: LabelSystem) => void } | null>(null);

/** The line under the selector: two ways to name a note from the home note, said from the side the page starts on. */
const LINE: Record<"interval" | "solfege", string> = {
  solfege:
    "There are two ways to name a note by where it sits from the home note: solfège and intervals. This page starts in solfège, Do, Re, Mi: the names singers use. Intervals name the same notes R, 2, 3, with R for the root. It's okay to go with your feeling: pick the names that stick.",
  interval:
    "There are two ways to name a note by where it sits from the home note: intervals and solfège. This page starts in intervals, R, 2, 3, with R for the root: the way guitar players count. Solfège names the same notes Do, Re, Mi. It's okay to go with your feeling: pick the names that stick.",
};

/**
 * Every dot inside is labelled as the article starts it (`initial`: Solfège for singing, Intervals for guitar), whatever the
 * reader's Labels setting. The switch (`LabelSwitch`, at the bottom of the page) changes it for this page only, so every
 * article opens on its own default.
 */
export function ArticleLabels({ initial, children }: { initial: LabelSystem; children: ReactNode }) {
  const [value, set] = useState<LabelSystem>(initial);
  return (
    <Choice.Provider value={{ initial, value, set }}>
      <FixedLabelSystem value={value}>{children}</FixedLabelSystem>
    </Choice.Provider>
  );
}

/** The Labels selector at the bottom of an article: Intervals or Solfège, a line on the two systems said from the page's default, and the link to the article with every name on a piano. */
export function LabelSwitch() {
  const choice = useContext(Choice);
  if (!choice) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <ChipRow label="Labels">
        {CHOICES.map((c) => <Chip key={c.id} on={choice.value === c.id} onClick={() => choice.set(c.id)}>{c.label}</Chip>)}
      </ChipRow>
      <p className="text-sm text-slate-400">
        {LINE[choice.initial === "solfege" ? "solfege" : "interval"]}{" "}
        <Link href={`/learn/${NAMES_ARTICLE}`} className="text-sky-300 underline-offset-2 hover:underline">See every name on a piano and a guitar neck</Link>
      </p>
    </div>
  );
}
