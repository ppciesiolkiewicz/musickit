import DevName from "@/components/DevName";
import Link from "next/link";
import Icon from "@/components/Icon";
import Tab from "@/components/theory/Tab";
import LessonVisual from "./LessonVisual";
import { DISPLAY } from "@/components/landing/Display";
import { TONE, sectionFor } from "@/features/theory/sections";
import type { CourseLink } from "@/features/course/model";
import { STRUMS } from "@/features/course/strum";
import type { Block, CourseSection } from "@/features/course/model";
import StrumGrid from "./StrumGrid";

const chordHref = (c: string) => `/theory/chords?q=${encodeURIComponent(c)}`;

function ChordChips({ chords }: { chords: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {chords.map((c) => <Link key={c} href={chordHref(c)} className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 transition hover:brightness-125">{c}</Link>)}
    </div>
  );
}

/** An explore or practise link as a card, wearing the icon and colour of the page it opens. */
function LinkCard({ link, kind }: { link: CourseLink; kind: "Explore" | "Practise" }) {
  const sec = sectionFor(link.href.split(/[?#]/)[0]);
  const tone = TONE[sec?.tone ?? "sky"];
  return (
    <Link href={link.href} className="group flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-600 hover:bg-slate-800/50">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone.chip}`}><Icon name={kind === "Practise" ? "target" : sec?.icon ?? "music"} size={16} className={tone.icon} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider text-slate-500">{kind}{sec && ` · ${sec.label}`}</span>
        <span className="block text-sm text-slate-100 group-hover:text-white">{link.label}</span>
        {link.note && <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{link.note}</span>}
      </span>
      <Icon name="chevron-right" size={16} className="mt-2 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
    </Link>
  );
}

/** A visual's params for the dev tag: everything but its kind and caption. */
const paramsOf = (v: object): object => Object.fromEntries(Object.entries(v).filter(([k]) => k !== "kind" && k !== "caption"));

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <div className="flex max-w-3xl flex-col gap-3 leading-relaxed text-slate-300">{block.paras.map((p, i) => <p key={i}>{p}</p>)}</div>;
    case "visual":
      return <div className="flex flex-col gap-1 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-3 shadow-2xl shadow-black/20 sm:p-4"><DevName name={`visual · ${block.visual.kind}`} params={paramsOf(block.visual)} /><LessonVisual visual={block.visual} /></div>;
    case "strum": {
      const p = STRUMS[block.pattern];
      return (
        <figure className="flex flex-col gap-3 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-3 sm:p-4">
          <DevName name="strum" params={{ pattern: block.pattern, chords: block.chords }} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-slate-100">{p.name}</b>
            <ChordChips chords={block.chords} />
          </div>
          <StrumGrid pattern={p} />
          <figcaption className="text-xs text-slate-400">{block.caption}</figcaption>
        </figure>
      );
    }
    case "links":
      return (
        <div className="grid gap-2 md:grid-cols-2">
          {block.explore.map((l) => <LinkCard key={l.href + l.label} link={l} kind="Explore" />)}
          {block.practise.map((l) => <LinkCard key={l.href + l.label} link={l} kind="Practise" />)}
        </div>
      );
    case "songs":
      return (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {block.songs.map((s) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div>
                <p className="text-lg leading-tight text-slate-50" style={DISPLAY}>{s.title}</p>
                <p className="text-xs text-slate-500">{s.artist}</p>
              </div>
              <ChordChips chords={s.chords} />
              <p className="font-mono text-xs text-slate-400">{s.progression}</p>
              {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
            </li>
          ))}
        </ul>
      );
    case "melody":
      return <div className="flex flex-col gap-1"><DevName name="melody · Tab" params={block.melody} /><Tab {...block.melody} /></div>;
    case "task":
      return (
        <div className="max-w-3xl rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-300"><Icon name="target" size={14} />Try this</p>
          <p className="text-sm leading-relaxed text-slate-200">{block.text}</p>
        </div>
      );
  }
}

/** A section's content, block by block, in the order the course data lists them. */
export default function SectionBody({ section }: { section: CourseSection }) {
  return <div className="flex min-w-0 flex-col gap-6">{section.blocks.map((b, i) => <BlockView key={i} block={b} />)}</div>;
}
