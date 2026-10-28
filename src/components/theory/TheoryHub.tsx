import Link from "next/link";
import Icon from "@/components/Icon";
import { SectionBlock } from "@/components/TheoryMenu";
import { DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import ScaleWheel from "./ScaleWheel";
import { GROUP_LABEL, THEORY_SECTIONS, type SectionGroup } from "@/features/theory/sections";
import { degreeLabels } from "@/features/theory/scales";
import { MAJOR } from "@/features/theory/theory";
import { COURSE, sectionHref, stageColour } from "@/features/course/course";

const MORE: SectionGroup[] = ["learn", "explore", "practice", "tools"];

/** The /theory landing page: a hero, the course stages as a path down the page, then every explorer and practice tool. */
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
            From your first open chords to the whole neck, one position at a time: chords, triads, arpeggios and scales together, with every shape and exercise ready to play right here.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/course" className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
              Start the course <Icon name="chevron-right" size={16} />
            </Link>
            <a href="#stages" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
              See every stage
            </a>
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {COURSE.slice(0, 5).map((st) => (
            <li key={st.slug}>
              <Link href={sectionHref(st.slug, st.sections[0].slug)} className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3 transition hover:border-slate-500">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-slate-950" style={{ background: stageColour(st.slug) }}>{st.label}</span>
                <span className="min-w-0">
                  <span className="block text-lg text-slate-50" style={DISPLAY}>{st.title}</span>
                  <span className="block truncate text-sm text-slate-400">{st.sections.map((x) => x.title).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
          <li className="px-1 text-xs leading-relaxed text-slate-500">…and {COURSE.length - 5} more stages up the neck, through modes and into other keys.</li>
        </ol>
      </section>

      <section id="stages" aria-labelledby="stages-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
        <div className="mb-10 grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <Eyebrow tone="text-emerald-300">The path</Eyebrow>
            <H2 id="stages-h">Rough order, <span className="italic text-emerald-300">not a ladder.</span></H2>
            <p className="mt-4 max-w-2xl text-slate-300">Nothing has to be mastered before you move on. Mark sections as warm-ups or ones to come back to, and skip around when something calls you.</p>
          </div>
          <ScaleWheel steps={MAJOR} labels={degreeLabels(MAJOR)} size={140} className="hidden md:block" />
        </div>

        <ol className="relative flex flex-col gap-4">
          <span aria-hidden className="absolute bottom-6 left-[1.4rem] top-6 w-0.5 bg-linear-to-b from-teal-400/60 via-violet-400/50 to-rose-400/60" />
          {COURSE.map((st) => (
            <li key={st.slug} className="relative flex gap-4 sm:gap-6">
              <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-slate-950 ring-8 ring-slate-950/60" style={{ background: stageColour(st.slug) }}>{st.label}</span>
              <Link href={sectionHref(st.slug, st.sections[0].slug)} className="group min-w-0 flex-1 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-4 transition hover:border-slate-500 sm:p-5">
                <h3 className="flex items-center justify-between gap-3 text-xl text-slate-50 sm:text-2xl" style={DISPLAY}>
                  {st.title}
                  <Icon name="chevron-right" size={16} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{st.intro}</p>
              </Link>
            </li>
          ))}
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
