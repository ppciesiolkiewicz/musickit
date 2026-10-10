"use client";

import { fmtDegree, scaleToneCaption, scaleToneLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { LabelsRow } from "@/components/LabelsRow";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyPicker } from "./KeyPicker";
import ModeCompare from "./ModeCompare";
import { DegreeLegend, Info } from "@/components/ui";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { MODE_PAGES, degreeColour, degreeLabels, relativesOf } from "@/features/theory/scales";

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** Every mode side by side in one key: scale degrees, notes and relatives. */
export default function ScalesIndex({ initialKey }: { initialKey: number }) {
  const [tonicPc, setTonicPc] = useState(initialKey);
  const [system] = useLabelSystem();

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("key", String(tonicPc));
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  }, [tonicPc]);

  const rows = useMemo(
    () =>
      FAMILIES.map((fam, fi) => ({
        fam,
        modes: MODE_PAGES.filter((m) => m.familyIndex === fi).map((m) => {
          const ctx = makeKeyContext(tonicPc, fi, m.modeIndex);
          return { page: m, ctx, rel: relativesOf(ctx), labels: degreeLabels(ctx.steps) };
        }),
      })),
    [tonicPc],
  );
  const pageFor = (f: number, m: number) => MODE_PAGES.find((p) => p.familyIndex === f && p.modeIndex === m)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
        <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
        <LabelsRow />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <DegreeLegend />
          <Info label="How to read the cards">
            Each card is one mode starting on the key you chose. The coloured circles are its seven notes in order. The small label above each is the scale degree, written against the major scale, so ♭3 means the 3rd is lowered and ♯4 means the 4th is raised. Colour follows the degree: 1 white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose. Relative major and relative minor are the major and natural minor scales that use exactly the same seven notes.
          </Info>
        </div>
      </div>

      <ModeCompare tonicPc={tonicPc} />

      {rows.map(({ fam, modes }, fi) => (
        <section key={fam.id}>
          <h2 className="mb-2 text-sm font-medium text-slate-200">{fam.label}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {modes.map(({ page, ctx, rel, labels }) => (
              <article key={page.slug} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
                <header>
                  <Link href={`/theory/scales/${page.slug}?key=${tonicPc}`} className="group flex flex-wrap items-baseline gap-x-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                    <h3 className="text-base text-slate-100 group-hover:text-sky-300 group-hover:underline">{ctx.names[0]} {ctx.modeName}</h3>
                    <span className="text-xs text-slate-500 group-hover:text-slate-300">{fam.info[page.modeIndex].mood}</span>
                  </Link>
                </header>

                <div className="flex flex-wrap gap-1.5" aria-label={`Notes of ${ctx.names[0]} ${ctx.modeName}`}>
                  {ctx.names.map((n, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span className="text-xs tabular-nums text-slate-400">{scaleToneCaption(system, ctx, i)}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-slate-950" style={{ background: degreeColour(i) }} title={n}>{scaleToneLabel(system, ctx, i)}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400">
                  Degrees <span className="tabular-nums text-slate-300">{labels.map(fmtDegree).join(" ")}</span>
                </p>

                <ul className="space-y-1 text-xs text-slate-300">
                  {page.modeIndex !== 0 && !rel.relativeMajor && (
                    <li>
                      Parent scale: <b>{rel.parentTonic} {rel.parentName}</b> (starts on its {ORD[page.modeIndex]} degree)
                    </li>
                  )}
                  {rel.relativeMajor && page.modeIndex !== 0 && (
                    <li>
                      Relative major: <Link className="text-sky-300 hover:underline" href={`/theory/scales/${pageFor(0, 0).slug}?key=${rel.relativeMajor.tonicPc}`}>{rel.relativeMajor.tonic} major</Link> <span className="text-slate-500">(this mode starts on its {ORD[page.modeIndex]} degree)</span>
                    </li>
                  )}
                  {rel.relativeMinor && page.modeIndex !== 5 && (
                    <li>
                      Relative minor: <Link className="text-sky-300 hover:underline" href={`/theory/scales/${pageFor(0, 5).slug}?key=${rel.relativeMinor.tonicPc}`}>{rel.relativeMinor.tonic} natural minor</Link> <span className="text-slate-500">(starts on the 6th degree of {rel.parentTonic} major)</span>
                    </li>
                  )}
                  {!rel.relativeMajor && (
                    <li className="text-slate-400">
                      Not a rotation of the major scale, so it has no relative major or minor. It shares its notes with the other {fam.label.toLowerCase()}.
                    </li>
                  )}
                  {rel.vsMajor.length > 0 && <li className="text-slate-400">Versus {ctx.names[0]} major: <b className="text-slate-300">{rel.vsMajor.join(" ")}</b> altered</li>}
                  {rel.vsMinor.length > 0 && <li className="text-slate-400">Versus {ctx.names[0]} natural minor: <b className="text-slate-300">{rel.vsMinor.join(" ")}</b> differ</li>}
                </ul>

                <Link href={`/theory/scales/${page.slug}?key=${tonicPc}`} className="mt-auto self-start rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400 hover:text-sky-100">
                  Every chord in {ctx.names[0]} {ctx.modeName} →
                </Link>
              </article>
            ))}
          </div>
          {fi === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              The seven major modes share one set of notes. Read down the cards and you can see the same seven notes starting on each of them.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
