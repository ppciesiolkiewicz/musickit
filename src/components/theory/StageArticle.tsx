import Link from "next/link";
import Icon from "@/components/Icon";
import Tab from "./Tab";
import TrackVisual from "./TrackVisual";
import { DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import { TONE, sectionFor } from "@/features/theory/sections";
import { degreeColour } from "@/features/theory/scales";
import { TRACKS, stageHref } from "@/features/theory/course/outline";
import { STAGE_CONTENT, type CourseLink, type Stage, type Track } from "@/features/theory/course/stages";
import { trackVisual } from "@/features/theory/course/visuals";

const chordHref = (c: string) => `/theory/chords?q=${encodeURIComponent(c)}`;
const metaOf = (id: Track["id"]) => TRACKS.find((t) => t.id === id)!;
/** Each stage keeps a colour from the degree palette, so the stepper, hub and next-stage card agree. */
export const stageColour = (n: number) => degreeColour([1, 2, 5, 6][n - 1] ?? 0);

/** The four stages as a row of numbered stops, the current one lit. */
export function StageStepper({ current }: { current: number }) {
  return (
    <nav aria-label="Stages" className="flex items-center gap-1.5">
      {STAGE_CONTENT.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1.5">
          {i > 0 && <span className={`h-0.5 w-6 rounded-full sm:w-10 ${s.n <= current ? "bg-slate-400" : "bg-slate-800"}`} />}
          <Link
            href={stageHref(s.n)}
            aria-current={s.n === current ? "page" : undefined}
            title={`Stage ${s.n}: ${s.title}`}
            className={`grid size-9 place-items-center rounded-full text-sm font-bold transition ${s.n === current ? "text-slate-950 ring-4 ring-white/10" : s.n < current ? "text-slate-950 opacity-70 hover:opacity-100" : "border border-slate-700 text-slate-400 hover:border-slate-500"}`}
            style={s.n <= current ? { background: stageColour(s.n) } : undefined}
          >
            {s.n}
          </Link>
        </div>
      ))}
    </nav>
  );
}

/** The top of a stage page: the stage big, what it is about, and its three tracks as a list to jump to. */
export function StageHero({ stage }: { stage: Stage }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 pb-4 pt-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div>
        <Eyebrow tone="text-sky-300">Stage {stage.n} of {STAGE_CONTENT.length} · {stage.level}</Eyebrow>
        <h1 className="text-4xl leading-[1.04] text-slate-50 text-balance sm:text-6xl" style={DISPLAY}>{stage.title}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">{stage.intro}</p>
        <div className="mt-6"><StageStepper current={stage.n} /></div>
      </div>
      <div className="relative isolate">
        <div aria-hidden className="absolute inset-0 -z-10 rounded-4xl lg:-inset-6 opacity-40 blur-3xl" style={{ background: `radial-gradient(60% 60% at 70% 30%, ${stageColour(stage.n)}55, transparent)` }} />
        <ol className="flex flex-col gap-2 rounded-3xl border border-slate-700/70 bg-slate-900/60 p-3 backdrop-blur">
          <li className="px-2 pb-1 pt-1 text-xs uppercase tracking-[0.2em] text-slate-500">In this stage</li>
          {stage.tracks.map((tr) => {
            const meta = metaOf(tr.id);
            return (
              <li key={tr.id}>
                <a href={`#${tr.id}`} className="group flex items-start gap-3 rounded-2xl border border-transparent p-2.5 transition hover:border-slate-700 hover:bg-slate-800/50">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE[meta.tone].chip}`}><Icon name={meta.icon} size={18} className={TONE[meta.tone].icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs uppercase tracking-wider ${TONE[meta.tone].icon}`}>{meta.label}</span>
                    <span className="block text-slate-100">{tr.headline}</span>
                    <span className="block truncate text-xs text-slate-500">{tr.learn.join(" · ")}</span>
                  </span>
                  <Icon name="chevron-down" size={16} className="mt-3 shrink-0 text-slate-600 transition group-hover:text-slate-300" />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** An explore or practise link as a card, wearing the icon and colour of the page it opens. */
function LinkCard({ link, kind, fallback }: { link: CourseLink; kind: "Explore" | "Practise"; fallback: ReturnType<typeof metaOf> }) {
  const sec = sectionFor(link.href.split(/[?#]/)[0]);
  const tone = TONE[sec?.tone ?? fallback.tone];
  return (
    <Link href={link.href} className="group flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-600 hover:bg-slate-800/50">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone.chip}`}><Icon name={kind === "Practise" ? "target" : sec?.icon ?? fallback.icon} size={16} className={tone.icon} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider text-slate-500">{kind}{sec && ` · ${sec.label}`}</span>
        <span className="block text-sm text-slate-100 group-hover:text-white">{link.label}</span>
        {link.note && <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{link.note}</span>}
      </span>
      <Icon name="chevron-right" size={16} className="mt-2 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
    </Link>
  );
}

/** One track of a stage as a full-width band: the idea and checkpoint beside a live picture, then links and songs underneath. */
function TrackSection({ stage, tr, index }: { stage: Stage; tr: Track; index: number }) {
  const meta = metaOf(tr.id);
  const tone = TONE[meta.tone];
  const visual = trackVisual(stage.n, tr.id);
  // a whole neck needs the full width to stay readable, so it goes under the text instead of beside it
  const wide = visual?.kind === "neck" && visual.to - visual.from >= 12;
  const flip = index % 2 === 1 && !wide;
  const hasSide = !wide && (visual || tr.melodies?.length);
  return (
    <section id={tr.id} aria-labelledby={`${tr.id}-h`} className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
      <div className={`grid grid-cols-1 items-start gap-8 lg:gap-12 ${hasSide ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" : ""}`}>
        <div className={flip && hasSide ? "lg:order-2" : ""}>
          <Eyebrow tone={tone.icon}><span className="inline-flex items-center gap-2"><Icon name={meta.icon} size={14} />{meta.label} · {meta.desc}</span></Eyebrow>
          <H2 id={`${tr.id}-h`} className="sm:text-4xl">{tr.headline}</H2>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {tr.learn.map((l) => <span key={l} className={`rounded-full px-3 py-1 text-xs font-medium ${tone.chip} ${tone.icon}`}>{l}</span>)}
          </div>
          <p className="mt-5 leading-relaxed text-slate-300">{tr.why}</p>
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-300"><Icon name="check" size={14} />Ready to move on when</p>
            <p className="text-sm leading-relaxed text-slate-200">{tr.checkpoint}</p>
          </div>
          {tr.tip && (
            <p className="mt-4 flex gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-relaxed text-slate-300">
              <Icon name="sparkles" size={16} className="mt-0.5 shrink-0 text-amber-300" />{tr.tip}
            </p>
          )}
        </div>
        {hasSide && (
          <div className={`flex min-w-0 flex-col gap-3 ${flip ? "lg:order-1" : ""}`}>
            {visual && (
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/50 p-3 shadow-2xl shadow-black/20 sm:p-4">
                <TrackVisual visual={visual} />
              </div>
            )}
            {tr.melodies?.map((mel) => <Tab key={mel.title} {...mel} />)}
          </div>
        )}
      </div>

      {wide && visual && (
        <div className="mt-8 flex flex-col gap-3">
          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/50 p-3 shadow-2xl shadow-black/20 sm:p-4">
            <TrackVisual visual={visual} />
          </div>
          {!!tr.melodies?.length && <div className="grid gap-3 lg:grid-cols-2">{tr.melodies.map((mel) => <Tab key={mel.title} {...mel} />)}</div>}
        </div>
      )}

      <div className="mt-10 grid gap-2 md:grid-cols-2">
        {tr.explore.map((l) => <LinkCard key={l.href + l.label} link={l} kind="Explore" fallback={meta} />)}
        {tr.practise.map((l) => <LinkCard key={l.href + l.label} link={l} kind="Practise" fallback={meta} />)}
      </div>

      {tr.songs && (
        <div className="mt-10">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400"><Icon name="music" size={14} className={tone.icon} />Songs to try</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tr.songs.map((s) => (
              <li key={s.title} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div>
                  <p className="text-lg leading-tight text-slate-50" style={DISPLAY}>{s.title}</p>
                  <p className="text-xs text-slate-500">{s.artist}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.chords.map((c) => <Link key={c} href={chordHref(c)} className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition hover:brightness-125 ${tone.chip} ${tone.icon}`}>{c}</Link>)}
                </div>
                <p className="font-mono text-xs text-slate-400">{s.progression}</p>
                {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** One stage of the course: each track a full band down the page, then the way on to the next stage. */
export default function StageArticle({ stage, prev, next }: { stage: Stage; prev?: Stage; next?: Stage }) {
  return (
    <div className="flex flex-col">
      <p className="mt-2 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
        <b className="text-slate-200">Rough order, not a ladder.</b> Each track moves at its own pace: your chords can be here while your lead playing is still a stage behind. Nothing has to be mastered before you move on.
      </p>
      {stage.tracks.map((tr, i) => <TrackSection key={tr.id} stage={stage} tr={tr} index={i} />)}

      <nav aria-label="More stages" className="flex flex-col gap-3 border-t border-slate-800/70 pt-12">
        {next ? (
          <Link href={stageHref(next.n)} className="group relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/60 p-6 transition hover:border-slate-500 sm:p-8">
            <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(50% 120% at 100% 0%, ${stageColour(next.n)}66, transparent)` }} />
            <div className="relative">
              <Eyebrow tone="text-slate-400">Next · Stage {next.n} · {next.level}</Eyebrow>
              <p className="text-3xl text-slate-50 sm:text-4xl" style={DISPLAY}>{next.title}</p>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{next.intro}</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition group-hover:bg-sky-300">Go to stage {next.n} <Icon name="chevron-right" size={16} /></span>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8">
            <Eyebrow tone="text-emerald-300">The last stage</Eyebrow>
            <p className="text-3xl text-slate-50" style={DISPLAY}>Now it&apos;s your music.</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Go back to any track that felt shaky, pick a style you love, and build your own cheatsheet of the shapes you actually use.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/theory" className="text-sky-300 hover:underline">← All stages</Link>
          {prev && <Link href={stageHref(prev.n)} className="text-slate-400 hover:text-slate-200">Back to stage {prev.n}: {prev.title}</Link>}
        </div>
      </nav>
    </div>
  );
}
