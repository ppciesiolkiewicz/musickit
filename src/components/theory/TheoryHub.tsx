import Link from "next/link";
import Icon from "@/components/Icon";
import { SectionBlock } from "@/components/TheoryMenu";
import { DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import ScaleWheel from "./ScaleWheel";
import { stageColour } from "./StageArticle";
import { GROUP_LABEL, THEORY_SECTIONS, TONE, type SectionGroup } from "@/features/theory/sections";
import { degreeLabels } from "@/features/theory/scales";
import { MAJOR } from "@/features/theory/theory";
import { STAGES, TRACKS, stageHref } from "@/features/theory/course/outline";
import { STAGE_CONTENT } from "@/features/theory/course/stages";

const MORE: SectionGroup[] = ["learn", "explore", "practice", "tools"];

/** The /theory landing page: a hero, the four stages as a path down the page, then every explorer and practice tool. */
export default function TheoryHub() {
  return (
    <div className="flex flex-col">
      <section aria-labelledby="hub-h" className="grid grid-cols-1 items-center gap-10 pb-12 pt-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <Eyebrow>The self-paced course</Eyebrow>
          <h1 id="hub-h" className="text-4xl leading-[1.04] text-slate-50 text-balance sm:text-6xl" style={DISPLAY}>
            Learn guitar on your own, <span className="italic text-sky-300">one stage at a time.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Four stages, from your first open chords to the whole neck. Each one teaches chords, lead playing and your ear together, with every chord, scale and exercise ready to play right here.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={stageHref(1)} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
              Start at stage 1 <Icon name="chevron-right" size={16} />
            </Link>
            <a href="#stages" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
              See all four stages
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {TRACKS.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${TONE[t.tone].chip}`}><Icon name={t.icon} size={20} className={TONE[t.tone].icon} /></span>
              <span className="min-w-0">
                <span className="block text-lg text-slate-50" style={DISPLAY}>{t.label}</span>
                <span className="block text-sm text-slate-400">{t.desc}</span>
              </span>
            </div>
          ))}
          <p className="px-1 text-xs leading-relaxed text-slate-500">Three tracks in every stage, each at its own pace: your chords can be at stage 3 while your soloing is still at stage 2.</p>
        </div>
      </section>

      <section id="stages" aria-labelledby="stages-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
        <div className="mb-10 grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <Eyebrow tone="text-emerald-300">The path</Eyebrow>
            <H2 id="stages-h">Rough order, <span className="italic text-emerald-300">not a ladder.</span></H2>
            <p className="mt-4 max-w-2xl text-slate-300">Nothing has to be mastered before you move on. Each stage ends with a simple check for every track, so you know when you&apos;re ready, and you can always come back.</p>
          </div>
          <ScaleWheel steps={MAJOR} labels={degreeLabels(MAJOR)} size={140} className="hidden md:block" />
        </div>

        <ol className="relative flex flex-col gap-6">
          <span aria-hidden className="absolute bottom-6 left-[1.4rem] top-6 w-0.5 bg-linear-to-b from-teal-400/60 via-violet-400/50 to-rose-400/60 sm:left-[1.65rem]" />
          {STAGES.map((s) => {
            const full = STAGE_CONTENT.find((c) => c.n === s.n)!;
            return (
              <li key={s.n} className="relative flex gap-4 sm:gap-6">
                <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold text-slate-950 ring-8 ring-slate-950/60 sm:size-14 sm:text-xl" style={{ background: stageColour(s.n) }}>{s.n}</span>
                <div className="min-w-0 flex-1 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: stageColour(s.n) }}>Stage {s.n} · {s.level}</p>
                      <h3 className="mt-1 text-2xl text-slate-50 sm:text-3xl" style={DISPLAY}>{s.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{full.intro}</p>
                    </div>
                    <Link href={stageHref(s.n)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                      Open stage {s.n} <Icon name="chevron-right" size={16} />
                    </Link>
                  </div>
                  <ul className="mt-5 flex flex-col divide-y divide-slate-800/80 border-t border-slate-800/80">
                    {TRACKS.map((t) => (
                      <li key={t.id}>
                        <Link href={stageHref(s.n, t.id)} className="group flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                          <span className={`flex w-40 shrink-0 items-center gap-2 text-sm font-medium ${TONE[t.tone].icon}`}><Icon name={t.icon} size={16} />{t.label}</span>
                          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {s.cells[t.id].map((c) => <span key={c} className={`rounded-full px-2.5 py-0.5 text-xs text-slate-200 ${TONE[t.tone].chip}`}>{c}</span>)}
                          </span>
                          <Icon name="chevron-right" size={16} className="hidden shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300 sm:block" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="tools-h" className="border-t border-slate-800/70 py-12 sm:py-16">
        <Eyebrow tone="text-amber-300">Tools for every stage</Eyebrow>
        <H2 id="tools-h" className="mb-8 sm:text-4xl">Explore, drill, <span className="italic text-amber-300">and hear it.</span></H2>
        <div className="flex flex-col gap-6">
          {MORE.map((g) => (
            <div key={g} aria-label={GROUP_LABEL[g]}>
              <h3 className="mb-1 text-xs uppercase tracking-wider text-slate-500">{GROUP_LABEL[g]}</h3>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                {THEORY_SECTIONS.filter((x) => x.group === g && x.href !== "/theory").map((x) => <SectionBlock key={x.href} s={x} roomy />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
