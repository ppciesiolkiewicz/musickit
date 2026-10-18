"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FAMILIES, type KeyContext } from "@/features/theory/theory";
import { MODE_PAGES, relativesOf } from "@/features/theory/scales";
import { scaleHref } from "@/features/theory/keySlug";
import { ModeAlias } from "./ScaleSettings";

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/**
 * "Modes with the same notes": the other modes of the key's parent scale, each on its own tonic. Rows link to their scale page,
 * or call `onPick` instead when given (a widget that re-keys itself rather than leaving the page).
 */
export default function ScaleRelatives({ ctx, familyIndex, onPick, className = "" }: { ctx: KeyContext; familyIndex: number; onPick?: (s: { modeIndex: number; tonicPc: number }) => void; className?: string }) {
  const rel = useMemo(() => relativesOf(ctx), [ctx]);
  const fam = FAMILIES[familyIndex];
  const href = (s: { modeIndex: number; tonicPc: number }) => scaleHref(MODE_PAGES.find((p) => p.familyIndex === familyIndex && p.modeIndex === s.modeIndex)!.slug, s.tonicPc);

  return (
    <section id="relatives" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${className}`}>
      <h2 className="mb-2 text-sm font-medium text-slate-100">Modes with the same notes as {ctx.names[0]} {ctx.modeName}</h2>

      {fam.scales ? (
        <p className="text-sm text-slate-400">{ctx.modeName} is a scale of its own, not a mode of the major, harmonic minor or melodic minor scale, so no named mode shares its notes.</p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rel.siblings.map((s) => {
            const cls = `flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-sm transition ${s.isThis ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300 hover:border-slate-600"}`;
            const row = (
              <>
                <span>{s.tonic} {s.name}<ModeAlias familyIndex={familyIndex} modeIndex={s.modeIndex} /></span>
                <span className="text-xs text-slate-500">{ORD[s.modeIndex]} degree</span>
              </>
            );
            return onPick ? (
              <button key={s.modeIndex} type="button" onClick={() => onPick(s)} aria-pressed={s.isThis} className={cls}>{row}</button>
            ) : (
              <Link key={s.modeIndex} href={href(s)} aria-current={s.isThis ? "page" : undefined} className={cls}>{row}</Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
