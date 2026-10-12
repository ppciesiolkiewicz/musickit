import Link from "next/link";
import Tab from "./Tab";
import { TRACKS, stageHref } from "@/features/theory/course/outline";
import type { CourseLink, Stage } from "@/features/theory/course/stages";

const chordHref = (c: string) => `/theory/chords?q=${encodeURIComponent(c)}`;

function Links({ title, links }: { title: string; links: CourseLink[] }) {
  if (!links.length) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs uppercase tracking-wider text-slate-500">{title}</h4>
      <ul className="space-y-1 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sky-300 hover:underline">{l.label}</Link>
            {l.note && <span className="text-slate-400"> · {l.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One stage of the course: three tracks side by side, each with what to learn, why, where to explore, what to practise and songs. */
export default function StageArticle({ stage, prev, next }: { stage: Stage; prev?: Stage; next?: Stage }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        <p className="max-w-3xl">{stage.intro}</p>
        <p className="mt-1 max-w-3xl text-slate-500">Rough order, not a ladder: the three tracks run side by side and nothing has to be mastered before you move on.</p>
        <nav className="mt-2 flex flex-wrap gap-3 text-xs">
          <Link href="/theory" className="text-sky-300 hover:underline">← All stages</Link>
          {prev && <Link href={stageHref(prev.n)} className="text-sky-300 hover:underline">Stage {prev.n}: {prev.title}</Link>}
          {next && <Link href={stageHref(next.n)} className="text-sky-300 hover:underline">Stage {next.n}: {next.title} →</Link>}
          {TRACKS.map((t) => <a key={t.id} href={`#${t.id}`} className="text-slate-400 hover:text-slate-200">{t.label}</a>)}
        </nav>
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        {stage.tracks.map((tr) => {
          const meta = TRACKS.find((t) => t.id === tr.id)!;
          return (
            <section key={tr.id} id={tr.id} className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <header>
                <h2 className="text-base font-medium text-slate-100">{meta.label}</h2>
                <p className="text-xs text-slate-500">{meta.desc}</p>
              </header>
              <div className="flex flex-wrap gap-1.5">
                {tr.learn.map((l) => <span key={l} className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-200">{l}</span>)}
              </div>
              <p className="text-sm text-slate-300">{tr.why}</p>
              <Links title="Explore" links={tr.explore} />
              <Links title="Practise" links={tr.practise} />
              {tr.songs && (
                <div>
                  <h4 className="mb-1 text-xs uppercase tracking-wider text-slate-500">Songs to try</h4>
                  <ul className="space-y-1.5 text-sm">
                    {tr.songs.map((s) => (
                      <li key={s.title}>
                        <b className="text-slate-100">{s.title}</b> <span className="text-slate-500">· {s.artist}</span>
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          {s.chords.map((c) => <Link key={c} href={chordHref(c)} className="rounded border border-slate-700 px-1.5 text-slate-200 hover:border-sky-500/60">{c}</Link>)}
                          <span className="text-slate-500">{s.progression}</span>
                        </div>
                        {s.note && <div className="text-xs text-slate-500">{s.note}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tr.melodies?.map((mel) => <Tab key={mel.title} {...mel} />)}
              {tr.tip && <p className="text-xs text-slate-400">{tr.tip}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
