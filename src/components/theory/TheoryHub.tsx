import Link from "next/link";
import { SectionBlock } from "@/components/TheoryMenu";
import { GROUP_LABEL, THEORY_SECTIONS, type SectionGroup } from "@/features/theory/sections";
import { STAGES, TRACKS, stageHref } from "@/features/theory/course/outline";

const MORE: SectionGroup[] = ["learn", "explore", "practice", "tools"];

/** The /theory landing page: the course grid (stages × tracks) and every explorer and practice tool. */
export default function TheoryHub() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        <p className="max-w-3xl">
          A loose course for learning guitar with or without a teacher. Four stages run top to bottom, three tracks side by side: <b className="text-slate-100">chords</b>, <b className="text-slate-100">lead</b>, and <b className="text-slate-100">ear &amp; fretboard</b>. Move down each track at your own pace: your chords can be at stage 3 while your soloing is still at stage 2.
        </p>
        <p className="mt-2 max-w-3xl text-slate-400">Rough order, not a ladder. Nothing has to be mastered before you move on; come back any time. Every cell links to its part of a stage page, and every stage page links into the explorers and the practice games below.</p>
      </section>

      <section aria-label="Course" className="overflow-x-auto">
        <div className="grid min-w-0 gap-2 md:grid-cols-[12rem_repeat(3,minmax(0,1fr))]">
          <span className="hidden md:block" />
          {TRACKS.map((t) => (
            <div key={t.id} className="hidden px-2 md:block">
              <div className="text-sm font-medium text-slate-100">{t.label}</div>
              <div className="text-xs text-slate-500">{t.desc}</div>
            </div>
          ))}
          {STAGES.map((s) => (
            <div key={s.n} className="contents">
              <Link href={stageHref(s.n)} className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 hover:border-sky-500/60">
                <span className="text-xs uppercase tracking-wider text-sky-300">Stage {s.n} · {s.level}</span>
                <span className="text-sm text-slate-100">{s.title}</span>
              </Link>
              {TRACKS.map((t) => (
                <Link key={t.id} href={stageHref(s.n, t.id)} className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 transition hover:border-sky-500/60 hover:bg-slate-800/50">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500 md:hidden">{t.label}</span>
                  <ul className="list-disc space-y-0.5 pl-4">{s.cells[t.id].map((c) => <li key={c}>{c}</li>)}</ul>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {MORE.map((g) => (
        <section key={g} aria-label={GROUP_LABEL[g]}>
          <h2 className={`mb-1 text-xs uppercase tracking-wider text-slate-500`}>{GROUP_LABEL[g]}</h2>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {THEORY_SECTIONS.filter((x) => x.group === g && x.href !== "/theory").map((x) => <SectionBlock key={x.href} s={x} roomy />)}
          </div>
        </section>
      ))}
    </div>
  );
}
