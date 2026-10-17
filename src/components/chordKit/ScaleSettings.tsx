"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LabelSelect } from "@/features/theory/useLabelSystem";
import type { LabelSystem } from "@/features/theory/labels";
import { FAMILIES, TONICS, modeAlias } from "@/features/theory/theory";
import { MODE_PAGES } from "@/features/theory/scales";
import { scaleHref, scalesIndexHref } from "@/features/theory/keySlug";
import { Badge, Chip, InfoBox, InfoButton, Select } from "@/components/ui";
import { DegreeLegend } from "@/components/theory/DegreeLegend";
import { PocketTools } from "@/features/instruments";

/** Room the sticky bar takes at the top, for `scroll-mt` on the sections it jumps to. */
export const UNDER_BAR = "scroll-mt-48";

/** One labelled row of the bar. On a phone the chips scroll sideways instead of wrapping, so the bar stays short. */
function BarRow({ label, info, children }: { label: string; info?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex w-20 shrink-0 items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
        {label}
        {info && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About ${label.toLowerCase()}`} />}
      </span>
      <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-0.5 sm:flex-wrap sm:overflow-visible">{children}</div>
      {open && info && <InfoBox>{info}</InfoBox>}
    </div>
  );
}

const KEY_INFO = "The home note of the music. Every note and chord below is worked out relative to it, and spelled to match (F♯ in G major, not G♭).";
const LABEL_INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app; dot colours stay the same either way.";

export type JumpItem = { id: string; label: string; accent?: string };

/**
 * The settings that float over a scales page while it scrolls: key, labels, (on a mode page) which scale, and a jump bar.
 * `scale` is the current mode page's slug; leave it out on the index.
 */
export function ScaleSettingsBar({
  tonicPc, onTonic, scale, omitLabels, jumps, onJump, jumpExtra,
}: {
  tonicPc: number;
  onTonic: (pc: number) => void;
  scale?: string;
  omitLabels?: LabelSystem[];
  jumps: JumpItem[];
  onJump: (id: string) => void;
  jumpExtra?: ReactNode;
}) {
  return (
    <div className="sticky top-2 z-20 flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-2.5 py-2 shadow-lg shadow-black/30 backdrop-blur xl:flex-row xl:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {scale && <ScaleRow slug={scale} tonicPc={tonicPc} />}
        <BarRow label="Key" info={KEY_INFO}>
          {TONICS.map((t) => (
            <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
          ))}
        </BarRow>
        <BarRow label="Labels" info={LABEL_INFO}>
          <LabelSelect showLabel={false} omit={omitLabels} />
        </BarRow>
        <nav aria-label="Sections">
          <BarRow label="Jump to">
            {jumps.map((j) => (
              <button key={j.id} type="button" onClick={() => onJump(j.id)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                {j.accent && <span className="h-2 w-2 rounded-full" style={{ background: j.accent }} aria-hidden />}
                {j.label}
              </button>
            ))}
            {jumpExtra}
          </BarRow>
        </nav>
      </div>
      {/* play-along tools: under the settings on narrow screens, on the right once there is room */}
      <PocketTools keyPc={tonicPc} className="border-t border-slate-800 pt-2 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0" />
    </div>
  );
}

/** Switch to another mode in the same key, or go back to the list of all of them. */
function ScaleRow({ slug, tonicPc }: { slug: string; tonicPc: number }) {
  const router = useRouter();
  const current = MODE_PAGES.find((m) => m.slug === slug);
  const famId = current ? FAMILIES[current.familyIndex].id : "major";
  return (
    <BarRow label="Scale">
      <Select
        size="sm"
        value={slug}
        onChange={(s) => router.push(scaleHref(s, tonicPc))}
        aria-label="Scale"
        groups={FAMILIES.map((f, fi) => ({
          label: f.label,
          options: MODE_PAGES.filter((m) => m.familyIndex === fi).map((m) => {
            const alias = modeAlias(m.familyIndex, m.modeIndex);
            return { value: m.slug, label: alias ? `${m.name} (${alias})` : m.name };
          }),
        }))}
      />
      <Link href={scalesIndexHref(tonicPc, `#part-${famId}`)} className="shrink-0 rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-sky-300 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
        ← All scales
      </Link>
    </BarRow>
  );
}

/** "Major" or "Minor" next to Ionian and Aeolian; nothing for the other modes. */
export function ModeAlias({ familyIndex, modeIndex }: { familyIndex: number; modeIndex: number }) {
  const alias = modeAlias(familyIndex, modeIndex);
  if (!alias) return null;
  return <span> ({alias})</span>;
}

/** The degree colours with a heading and a short reading guide; `children` is the longer explanation behind the (i). */
export function ColourKey({ title = "Colour key", children }: { title?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={title} className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
      <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
        {children && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About the ${title.toLowerCase()}`} />}
      </h2>
      <DegreeLegend />
      <p className="text-xs text-slate-500">Each colour is a scale degree, counted from the key. A ♭ or ♯ note keeps its degree&apos;s colour: ♭3 is still amber.</p>
      {open && children && <InfoBox>{children}</InfoBox>}
    </section>
  );
}
