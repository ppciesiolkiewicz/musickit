"use client";

import { fmtDegree, scaleToneCaption, scaleToneLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColourKey, ModeAlias, ScaleSettingsBar, UNDER_BAR, WithSettings } from "./ScaleSettings";
import ModeCompare from "./ModeCompare";
import { FAMILIES, makeKeyContext, modeAlias, tonicName } from "@/features/theory/theory";
import { MODE_PAGES, degreeColour, degreeLabels, relativesOf, DOT_INK } from "@/features/theory/scales";
import { scaleCells, scaleLineMidi } from "@/lib/chordKit/scalePositions";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";
import { ScaleNeck } from "./ScaleNeck";
import { useNotePlayer } from "./useNotePlayer";
import TuneButton from "./TuneButton";
import { keySlug, scaleHref } from "@/features/theory/keySlug";
import { Section } from "@/components/ui";
import KeySignature from "@/components/theory/KeySignature";
import PentatonicCard from "./PentatonicCard";
import { PENTATONICS } from "@/features/theory/pentatonics";

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** Edge colour and one-line intro for each accordion on the page. */
const PARTS = {
  major: { accent: "#34d399", label: "Major modes", intro: "The seven modes of the major scale share one set of notes. Read down the cards and you can see the same seven notes starting on each of them." },
  harm: { accent: "#fbbf24", label: "Harmonic minor", intro: "Natural minor with a raised 7th. Its modes share their seven notes with each other, not with the major scale, and carry the exotic augmented 2nd." },
  mel: { accent: "#a78bfa", label: "Melodic minor", intro: "The major scale with a lowered 3rd. Its modes are the jazz sounds: Lydian dominant over a 7♯11, Altered over a dominant that resolves." },
  other: { accent: "#f472b6", label: "Other scales", intro: "Seven-note scales of their own, not modes of the three families above: the Arabic double harmonic, Persian, Hungarian minor, the Neapolitan scales and Verdi's enigmatic scale." },
  pent: { accent: "#fb923c", label: "Pentatonic scales", intro: "The two five-note scales most solos start from: the major scale without its 4th and 7th, and natural minor without its 2nd and 6th. They share their five notes, a minor 3rd apart: C major pentatonic is A minor pentatonic." },
  pentMore: { accent: "#fdba74", label: "More pentatonic scales", intro: "The blues scale (minor pentatonic with a ♯4 blue note), the other three pentatonics with the same five notes as major and minor (suspended, man gong, ritusen), and four Japanese scales with half steps in them. Each is a mode of the major scale with two notes left out." },
  compare: { accent: "#38bdf8", label: "Compare" },
} as const;
type PartId = keyof typeof PARTS;
const PART_IDS = Object.keys(PARTS) as PartId[];

/** Every mode side by side in one key: scale degrees, notes and relatives. */
export default function ScalesIndex({ initialKey, syncUrl = true }: { initialKey: number; /** write ?key=f-sharp to the address bar (off when embedded in another page) */ syncUrl?: boolean }) {
  const [tonicPc, setTonicPc] = useState(initialKey);
  const [system] = useLabelSystem();
  const [open, setOpen] = useState<Record<PartId, boolean>>({ compare: true, major: true, harm: true, mel: true, other: true, pent: true, pentMore: true });
  const [query, setQuery] = useState("");
  const toggle = (id: PartId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const setAll = (v: boolean) => setOpen({ compare: v, major: v, harm: v, mel: v, other: v, pent: v, pentMore: v });
  const allOpen = PART_IDS.every((id) => open[id]);
  const jump = (id: PartId) => {
    setOpen((o) => ({ ...o, [id]: true }));
    requestAnimationFrame(() => document.getElementById(`part-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  // one player for the page, so starting a scale on one card stops the light on another; keys are "<slug>:d<degree>"
  const player = useNotePlayer();
  const router = useRouter();
  /** A click on the card opens the scale, unless it lands on something of its own (a note, a button, a link) or ends a text selection. */
  const openCard = (e: React.MouseEvent, href: string) => {
    if ((e.target as Element).closest("a, button, .cursor-sound") || window.getSelection()?.toString()) return;
    router.push(href);
  };
  const activeIn = (slug: string) => (player.active?.startsWith(slug + ":") ? player.active.slice(slug.length + 1) : null);

  // arriving from a mode page (#part-harm): open that family and scroll to it
  useEffect(() => {
    if (!syncUrl) return;
    const id = window.location.hash.replace("#part-", "");
    if (!(id in PARTS)) return;
    const raf = requestAnimationFrame(() => jump(id as PartId));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  useEffect(() => {
    if (!syncUrl) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("key", keySlug(tonicPc));
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  }, [tonicPc, syncUrl]);

  const rows = useMemo(
    () =>
      FAMILIES.map((fam, fi) => ({
        fam,
        modes: MODE_PAGES.filter((m) => m.familyIndex === fi).map((m) => {
          const ctx = makeKeyContext(tonicPc, fi, m.modeIndex);
          return { page: m, ctx, rel: relativesOf(ctx), labels: degreeLabels(ctx.steps), line: scaleLineMidi(ctx), cells: scaleCells(ctx, 12) };
        }),
      })),
    [tonicPc],
  );
  // every word typed must appear in the scale's name or alias (Aeolian is also "minor"); while searching, families with no match drop out and the rest stay open
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;
  const shown = useMemo(
    () =>
      rows
        .map((r) => ({
          ...r,
          modes: r.modes.filter(({ page, ctx }) => {
            const text = [ctx.modeName, modeAlias(page.familyIndex, page.modeIndex), page.slug.replace(/-/g, " ")].join(" ").toLowerCase();
            return words.every((w) => text.includes(w));
          }),
        }))
        .filter((r) => r.modes.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- words is derived from query
    [rows, query],
  );
  const pents = PENTATONICS.filter((p) => {
    const text = [p.name, p.alias ?? "", "pentatonic", p.blue ? "blues" : "", p.slug.replace(/-/g, " ")].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
  /** One accordion of pentatonic cards: the two basic ones at the top of the page, the rest after the other scales. */
  const pentSection = (id: "pent" | "pentMore", list: typeof PENTATONICS) => {
    if (list.length === 0) return null;
    const total = PENTATONICS.filter((p) => !!p.basic === (id === "pent")).length;
    return (
      <div id={`part-${id}`} className={UNDER_BAR}>
        <Section title={PARTS[id].label} meta={`${searching ? `${list.length} of ${total}` : list.length} scales in ${tonicName(tonicPc)}`} open={searching || open[id]} onToggle={() => toggle(id)} accent={PARTS[id].accent}>
          <p className="mb-3 text-xs text-slate-400">{PARTS[id].intro}</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {list.map((p) => <PentatonicCard key={p.slug} scale={p} tonicPc={tonicPc} player={player} system={system} onOpen={openCard} />)}
          </div>
        </Section>
      </div>
    );
  };
  const pageFor = (f: number, m: number) => MODE_PAGES.find((p) => p.familyIndex === f && p.modeIndex === m)!;

  return (
    <WithSettings side={syncUrl} bar={<ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} side={syncUrl} />}>

      <ColourKey title="Colour key and how to read the cards">
        Each card is one mode starting on the key you chose. The coloured circles are its seven notes in order: tap one to hear it, or press Play to hear the scale up and back down. The fretboard shows every place the scale falls on the first 12 frets; tap a dot to hear it. Open a mode for its positions on the whole neck: five pentatonic boxes, and the full scale filled into the same five boxes. The small label above each is the scale degree, written against the major scale, so ♭3 means the 3rd is lowered and ♯4 means the 4th is raised. Colour follows the degree: 1 white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose. Relative major and relative minor are the major and natural minor scales that use exactly the same seven notes.
      </ColourKey>

      <div className="-mb-3 flex items-center gap-2">
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search scales: dorian, minor, pentatonic…" aria-label="Search scales"
          className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
        />
        {!searching && (
          <button type="button" onClick={() => setAll(!allOpen)} className="shrink-0 rounded-full px-2.5 py-0.5 text-xs text-sky-300 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {searching && shown.length === 0 && pents.length === 0 && <p className="text-sm text-slate-400">No scale matches “{query.trim()}”.</p>}

      {pentSection("pent", pents.filter((p) => p.basic))}

      {shown.map(({ fam, modes }) => (
        <div key={fam.id} id={`part-${fam.id}`} className={UNDER_BAR}>
        <Section title={fam.label} meta={`${searching ? `${modes.length} of ${rows.find((r) => r.fam.id === fam.id)!.modes.length}` : modes.length} ${fam.scales ? "scales" : "modes"} in ${modes[0].ctx.names[0]}`} open={searching || open[fam.id]} onToggle={() => toggle(fam.id)} accent={PARTS[fam.id].accent}>
          <p className="mb-3 text-xs text-slate-400">{PARTS[fam.id].intro}</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {modes.map(({ page, ctx, rel, labels, line, cells }) => {
              const active = activeIn(page.slug);
              const degreeOf = (midi: number) => ctx.steps.indexOf((midi - ctx.tonic.pc + 120) % 12);
              const playScale = () => player.play(line.map((m) => ({ key: `${page.slug}:d${degreeOf(m)}`, midi: m })), 240);
              const playTune = (tuneId: string) => player.playTimed(melodyTiming(generateMelody(scalePool(60 + ctx.tonic.pc, ctx.steps), ctx.steps)).map((n) => ({ key: `${page.slug}:d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);
              return (
              <article key={page.slug} onClick={(e) => openCard(e, scaleHref(page.slug, tonicPc))} className="group/card flex min-w-0 cursor-pointer flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 transition hover:border-sky-400/60">
                <header>
                  <Link href={scaleHref(page.slug, tonicPc)} className="group flex flex-wrap items-baseline gap-x-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                    <h3 className="text-base text-slate-100 group-hover:text-sky-300 group-hover:underline group-hover/card:text-sky-300">{ctx.names[0]} {ctx.modeName}<ModeAlias familyIndex={page.familyIndex} modeIndex={page.modeIndex} /></h3>
                    <span className="text-xs text-slate-500 group-hover:text-slate-300">{fam.info[page.modeIndex].mood}</span>
                  </Link>
                </header>

                <div className="flex flex-wrap items-end gap-1.5" aria-label={`Notes of ${ctx.names[0]} ${ctx.modeName}`}>
                  {ctx.names.map((n, i) => (
                    <button key={i} type="button" onClick={() => player.tap(`${page.slug}:d${i}`, line[i])} title={`${n}: tap to hear it`} className="cursor-sound flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                      <span className="text-xs tabular-nums text-slate-400">{scaleToneCaption(system, ctx, i)}</span>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${active === `d${i}` ? "scale-110 ring-[3px] ring-sky-400" : ""}`} style={{ background: degreeColour(i), color: DOT_INK }}>{scaleToneLabel(system, ctx, i)}</span>
                    </button>
                  ))}
                  <button type="button" onClick={playScale} className="cursor-sound mb-1 ml-1 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play</button>
                  <TuneButton onPlay={playTune} title="A short tune made from this scale, new every time" className="mb-1 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25" />
                </div>

                <ScaleNeck
                  compact cells={cells} big={() => true} active={active} labelSystem={system}
                  onNote={(c) => player.tap(`${page.slug}:d${c.degree}`, c.midi)}
                  title={`${ctx.names[0]} ${ctx.modeName} on the first 12 frets`}
                />

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className="text-xs text-slate-400">
                    Degrees <span className="tabular-nums text-slate-300">{labels.map(fmtDegree).join(" ")}</span>
                  </p>
                  <KeySignature ctx={ctx} />
                </div>

                <Section level={2} defaultOpen title="Relatives and differences">
                <ul className="space-y-1 text-xs text-slate-300">
                  {modeAlias(page.familyIndex, page.modeIndex) && (
                    <li>
                      {ctx.modeName} is the <b>{page.modeIndex === 5 ? "natural minor" : "major"}</b> scale.
                    </li>
                  )}
                  {page.modeIndex !== 0 && !rel.relativeMajor && !fam.scales && (
                    <li>
                      Parent scale: <b>{rel.parentTonic} {rel.parentName}</b> (starts on its {ORD[page.modeIndex]} degree)
                    </li>
                  )}
                  {rel.relativeMajor && page.modeIndex !== 0 && (
                    <li>
                      Relative major: <Link className="text-sky-300 hover:underline" href={scaleHref(pageFor(0, 0).slug, rel.relativeMajor.tonicPc)}>{rel.relativeMajor.tonic} major</Link> <span className="text-slate-500">(this mode starts on its {ORD[page.modeIndex]} degree)</span>
                    </li>
                  )}
                  {rel.relativeMinor && page.modeIndex !== 5 && (
                    <li>
                      Relative minor: <Link className="text-sky-300 hover:underline" href={scaleHref(pageFor(0, 5).slug, rel.relativeMinor.tonicPc)}>{rel.relativeMinor.tonic} natural minor</Link> <span className="text-slate-500">(starts on the 6th degree of {rel.parentTonic} major)</span>
                    </li>
                  )}
                  {!rel.relativeMajor && (
                    <li className="text-slate-400">
                      {fam.scales
                        ? "A scale of its own, not a rotation of another scale, so it has no relative major or minor."
                        : <>Not a rotation of the major scale, so it has no relative major or minor. It shares its notes with the other {fam.label.toLowerCase()}.</>}
                    </li>
                  )}
                  {rel.vsMajor.length > 0 && <li className="text-slate-400">Versus {ctx.names[0]} major: <b className="text-slate-300">{rel.majorSwaps.map((w) => `${w.degree} ${w.from} → ${w.to}`).join(", ")}</b></li>}
                  {rel.vsMinor.length > 0 && <li className="text-slate-400">Versus {ctx.names[0]} natural minor: <b className="text-slate-300">{rel.minorSwaps.map((w) => `${w.degree} ${w.from} → ${w.to}`).join(", ")}</b></li>}
                </ul>
                </Section>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={scaleHref(page.slug, tonicPc)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400 hover:text-sky-100">
                    Every chord in {ctx.names[0]} {ctx.modeName} →
                  </Link>
                  <Link href={scaleHref(page.slug, tonicPc, "#guitar")} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400 hover:text-sky-100">
                    Positions on the neck →
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        </Section>
        </div>
      ))}

      {pentSection("pentMore", pents.filter((p) => !p.basic))}

      {!searching && (
        <div id="part-compare" className={UNDER_BAR}>
          <ModeCompare tonicPc={tonicPc} open={open.compare} onToggle={() => toggle("compare")} accent={PARTS.compare.accent} />
        </div>
      )}
    </WithSettings>
  );
}
