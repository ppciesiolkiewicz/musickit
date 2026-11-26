"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Chip, ChipRow } from "@/components/ui";
import type { LabelSystem } from "@/features/theory/labels";
import { FixedLabelSystem } from "@/features/theory/useLabelSystem";
import { NAMES_ARTICLE } from "../model";

/** The two ways a page with a `labels` block can label its dots, as the Labels setting names them. */
const CHOICES = [{ id: "interval", label: "Intervals" }, { id: "solfege", label: "Solfège" }] as const satisfies readonly { id: LabelSystem; label: string }[];

const Choice = createContext<{ value: LabelSystem; set: (v: LabelSystem) => void } | null>(null);

/**
 * Every dot inside is labelled as the article starts it (`initial`: Solfège for singing, Intervals for guitar), whatever the
 * reader's Labels setting. The switch (`LabelSwitch`, at the bottom of the page) changes it for this page only, so every
 * article opens on its own default.
 */
export function ArticleLabels({ initial, children }: { initial: LabelSystem; children: ReactNode }) {
  const [value, set] = useState<LabelSystem>(initial);
  return (
    <Choice.Provider value={{ value, set }}>
      <FixedLabelSystem value={value}>{children}</FixedLabelSystem>
    </Choice.Provider>
  );
}

/** The Labels selector at the bottom of an article: Intervals or Solfège, a line that either is fine, and the link to the article with every name on a piano. */
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
