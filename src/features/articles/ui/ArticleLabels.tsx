"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { Chip, ChipRow } from "@/components/ui";
import type { LabelSystem } from "@/features/theory/labels";
import { FixedLabelSystem, useLabelSystem } from "@/features/theory/useLabelSystem";
import { NAMES_ARTICLE } from "../model";

/** The two ways a page with a `labels` block can label its dots, as the Labels setting names them. */
const CHOICES = [{ id: "interval", label: "Intervals" }, { id: "solfege", label: "Solfège" }] as const satisfies readonly { id: LabelSystem; label: string }[];
const isChoice = (v: LabelSystem) => CHOICES.some((c) => c.id === v);

const Choice = createContext<{ value: LabelSystem; set: (v: LabelSystem) => void } | null>(null);

/**
 * Every dot inside is labelled as intervals or in solfège: the reader's Labels setting when it is one of the two, else the
 * article's own (`fallback`). The switch (`LabelSwitch`) changes that setting, so the choice carries to the next page.
 */
export function ArticleLabels({ fallback, children }: { fallback: LabelSystem; children: ReactNode }) {
  const [stored, set] = useLabelSystem();
  const value = isChoice(stored) ? stored : fallback;
  return (
    <Choice.Provider value={{ value, set }}>
      <FixedLabelSystem value={value}>{children}</FixedLabelSystem>
    </Choice.Provider>
  );
}

/** The `labels` block: Intervals or Solfège, a line that either is fine, and the link to the article with every name on a piano. */
export function LabelSwitch() {
  const choice = useContext(Choice);
  if (!choice) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <ChipRow label="Labels">
        {CHOICES.map((c) => <Chip key={c.id} on={choice.value === c.id} onClick={() => choice.set(c.id)}>{c.label}</Chip>)}
      </ChipRow>
      <p className="text-sm text-slate-400">
        It&apos;s okay to go with your feeling now: intervals and solfège name the same notes.{" "}
        <Link href={`/learn/${NAMES_ARTICLE}`} className="text-sky-300 underline-offset-2 hover:underline">See every name on a piano</Link>
      </p>
    </div>
  );
}
