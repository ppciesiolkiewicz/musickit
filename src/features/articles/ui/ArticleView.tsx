import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import { parseTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";
import type { NoteRoot } from "@/features/plan/model/noteText";
import { CareLine, NoteText } from "@/features/plan/ui/reader/NoteText";
import { NeckFrets } from "@/components/chordKit/ScaleNeck";
import ChordName from "@/components/chordKit/ChordName";
import Explained from "@/components/course/Explained";
import type { Piece } from "@/features/course/glossary";
import { splitChords } from "../chordNames";
import { ARTICLES } from "../index";
import { AUTHOR } from "../author";
import { blockRoots, markArticle, markTitle, type Mark } from "../marks";
import { articleLabels, type Article, type ArticleBlock } from "../model";
import ArticleCard from "./ArticleCard";
import ChordChain, { CagedChain } from "./ChordChain";
import ChordFinder from "./ChordFinder";
import { ArticleLabels, LabelSwitch } from "./ArticleLabels";
import NamesChart from "./NamesChart";
import NamesNeck from "./NamesNeck";
import PlayerControls from "./PlayerControls";
import TempoTool from "./TempoTool";

/**
 * Chord boxes in an article: three to a row (two on a phone), as wide as the row allows and centred, so two or one sit in
 * the middle. Applied from outside, so the plan's chord-shapes keep their own size.
 */
const BIG_CHORDS =
  "[&_[data-tour=chord-shapes-chords]]:justify-center [&_[data-tour=chord-shapes-chords]>div]:w-[calc((100%-0.75rem)/2)] sm:[&_[data-tour=chord-shapes-chords]>div]:w-[calc((100%-1.5rem)/3)]";

/** Tools as long as the neck: on a wide screen they reach out past the column into the spare room (`bleed`), none on a phone. */
const WIDE = new Set<string>(["caged-neck"]);

/** A link to another guide or course section opens in place; any other (a tool like the tuner, the voice-care notes) opens in a new tab, so the reader keeps their place. */
const opensNewTab = (href: string) => !(href === "/learn" || href.startsWith("/learn/") || href.startsWith("/course/") || href.startsWith("#"));

/** Article text with its chord names drawn as names to point at, each opening its chord box. */
function ChordText({ pieces, root }: { pieces: Piece[]; root: NoteRoot | null }) {
  return pieces.flatMap((p, i) => (typeof p === "string" ? splitChords(p) : [p]).map((part, j) =>
    typeof part !== "string" && "chord" in part
      ? <ChordName key={`${i}-${j}`} name={part.chord} className="inline underline decoration-slate-500" />
      : <NoteText key={`${i}-${j}`} pieces={[part]} root={root} link={false} />,
  ));
}

/**
 * A title with its explained words (`markTitle`). Chord names stay plain text, so a heading reads as one line to a search
 * engine; the text under it opens their chord boxes.
 */
function ChordTitle({ text }: { text: string }) {
  return markTitle(text).map((piece, i) => typeof piece === "string" ? <Fragment key={i}>{piece}</Fragment> : <Explained key={i} pieces={[piece]} link={false} />);
}

/**
 * One line of article text as marked runs (`markArticle`): bold, links, care lines, the glossary's explained words with no
 * course link (the course needs a login), and `{{1}}` notes as dots counted from `root`.
 */
export function Inline({ runs, root = null }: { runs: Mark[]; root?: NoteRoot | null }) {
  return runs.map((r, k) =>
    r.kind === "link" ? <Link key={k} href={r.href} {...(opensNewTab(r.href) ? { target: "_blank", rel: "noopener" } : {})} className="text-sky-300 underline-offset-2 hover:underline">{r.text}</Link>
    : r.kind === "bold" ? <strong key={k} className="font-semibold text-slate-50"><ChordText pieces={r.pieces} root={root} /></strong>
    : r.kind === "care" ? <CareLine key={k}><ChordText pieces={r.pieces} root={root} /></CareLine>
    : <Fragment key={k}><ChordText pieces={r.pieces} root={root} /></Fragment>,
  );
}

function Block({ block, lines, root }: { block: ArticleBlock; /** the block's lines, marked (`markArticle`) */ lines: Mark[][]; /** what its notes count from (`blockRoots`) */ root: NoteRoot | null }) {
  switch (block.type) {
    case "p":
      return <p className="text-slate-300"><Inline runs={lines[0]} root={root} /></p>;
    case "h2":
      return <h2 className="mt-6 border-t border-slate-800 pt-8 text-xl font-semibold text-slate-50">{block.text}</h2>;
    case "list":
      return <ul className="flex list-disc flex-col gap-1.5 pl-5 text-slate-300">{block.items.map((t, i) => <li key={t}><Inline runs={lines[i]} root={root} /></li>)}</ul>;
    case "care":
      return <p><CareLine><Inline runs={lines[0]} root={root} /></CareLine></p>;
    case "player":
      return <PlayerControls />;
    case "names":
      return block.on === "guitar" ? <NamesNeck /> : <NamesChart octaves={block.octaves} />;
    case "guide": {
      const guide = ARTICLES.find((a) => a.slug === block.slug);
      return (
        <div className="flex flex-col gap-2">
          <p className="text-slate-300"><Inline runs={lines[0]} root={root} /></p>
          {guide && <ArticleCard article={guide} heading="h3" />}
        </div>
      );
    }
    case "chord-finder":
      return <ChordFinder />;
    case "chord-chain":
      return <ChordChain chords={block.chords} />;
    case "figure":
      return (
        <figure className="flex flex-col gap-2">
          <Image src={block.src} width={block.width} height={block.height} alt={block.alt} sizes="(min-width: 768px) 672px, 100vw" className="h-auto max-h-80 w-full rounded-2xl border border-slate-800 object-cover" />
          <figcaption className="text-sm text-slate-400">
            {block.caption}{" "}
            <span className="text-xs text-slate-500">
              Photo: <a href={block.credit.source} target="_blank" rel="noopener" className="underline-offset-2 hover:underline">{block.credit.by}</a>,{" "}
              <a href={block.credit.licenseUrl} target="_blank" rel="noopener license" className="underline-offset-2 hover:underline">{block.credit.license}</a>
            </span>
          </figcaption>
        </figure>
      );
    case "row": {
      const tools = block.tools.map((t) => parseTool(t)).filter((t) => t !== null);
      return <div className={`grid gap-4 ${tools.length > 1 ? "sm:grid-cols-2" : ""}`}>{tools.map((tool, i) => <div key={i} className={`min-w-0 ${WIDE.has(tool.type) && tools.length === 1 ? "bleed" : ""}`}><Tool tool={tool} /></div>)}</div>;
    }
    case "exercise": {
      const tools = [...(block.tool ? [block.tool] : []), ...(block.beside ? [block.beside] : [])].map((t) => parseTool(t)).filter((t) => t !== null);
      const chain = block.chain ? <CagedChain chords={block.chain.chords} barre={block.chain.barre} /> : null;
      const pair = tools.length + (chain ? 1 : 0) > 1;
      const between = block.between ?? [], at = block.lines.length;
      return (
        <section aria-label={block.title} className="metal-panel mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-50"><ChordTitle text={block.title} /></h2>
          {block.lines.map((t, i) => <p key={t} className="text-slate-300"><Inline runs={lines[i]} root={root} /></p>)}
          {(tools.length > 0 || chain) && (
            <div className={pair ? "flex flex-col gap-6" : "contents"}>
              {tools.map((tool, i) => (
                <Fragment key={i}>
                  {i === 1 && between.map((t, j) => <p key={t} className="text-slate-300"><Inline runs={lines[at + j]} root={root} /></p>)}
                  <div className={`my-2 min-w-0 ${BIG_CHORDS} ${WIDE.has(tool.type) ? "bleed" : ""}`}>{tool.type === "melody-singer" || tool.type === "run-singer" ? <TempoTool tool={tool} /> : <Tool tool={tool} />}</div>
                </Fragment>
              ))}
              {chain && <>{tools.length === 1 && between.map((t, j) => <p key={t} className="text-slate-300"><Inline runs={lines[at + j]} root={root} /></p>)}{chain}</>}
            </div>
          )}
          {block.after?.map((t, i) => <p key={t} className="text-slate-300"><Inline runs={lines[at + between.length + i]} root={root} /></p>)}
          {block.parts?.map((part, k) => {
            const from = at + between.length + (block.after?.length ?? 0) + block.parts!.slice(0, k).reduce((n, p) => n + p.lines.length, 0);
            const tool = part.tool ? parseTool(part.tool) : null;
            return (
              // a part is its own small section: a rule above it, so it doesn't run on from the tool before
              <div key={part.title} className="mt-4 flex flex-col gap-3 border-t border-slate-700/60 pt-6">
                <h3 className="text-base font-semibold text-slate-100"><ChordTitle text={part.title} /></h3>
                {part.lines.map((t, i) => <p key={t} className="text-slate-300"><Inline runs={lines[from + i]} root={root} /></p>)}
                {tool && <div className={`my-2 min-w-0 ${BIG_CHORDS}`}><Tool tool={tool} /></div>}
              </div>
            );
          })}
        </section>
      );
    }
  }
}

/** The ending of every article (and of /learn): Pio's note (`AUTHOR`) and a link to /about, then one line and the home page's main button. The words are here, not in the articles. */
export function JoinCard({ about = true }: { about?: boolean }) {
  return (
    <aside aria-label={about ? "About the author and joining attunr" : "Join attunr"} className="metal-panel mt-6 flex flex-col gap-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
      {about && (
        <>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small square photo, already sized (as in landing/Founder) */}
            <img src={AUTHOR.photo} alt={AUTHOR.alt} width={160} height={160} loading="lazy" className="size-16 shrink-0 rounded-full border border-white/15 object-cover ring-4 ring-sky-400/15" />
            <p className="text-sm text-slate-400"><b className="text-base text-slate-100">Written by {AUTHOR.name}</b><br />{AUTHOR.role}</p>
          </div>
          {AUTHOR.note.map((t) => <p key={t} className="text-slate-300">{t}</p>)}
          <p><Link href={AUTHOR.path} className="text-sky-300 underline-offset-2 hover:underline">More about me</Link></p>
        </>
      )}
      <div className={`flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between ${about ? "border-t border-slate-800 pt-4" : ""}`}>
        <p className="font-medium text-slate-100">Join attunr for more interactive exercises and a curated practice plan for every day.</p>
        <Link href="/plan" className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400">Start your plan</Link>
      </div>
    </aside>
  );
}

/** The other articles, as /learn draws them, and a link back to /learn. */
function MoreGuides({ current }: { current: string }) {
  const others = ARTICLES.filter((a) => a.slug !== current);
  if (!others.length) return null;
  return (
    <nav aria-label="More guides" className="mt-8 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-50">More guides</h2>
        <Link href="/learn" className="text-sm text-sky-300 underline-offset-2 hover:underline">All guides</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {others.slice(0, 2).map((a) => <li key={a.slug}><ArticleCard article={a} heading="h3" /></li>)}
      </ul>
    </nav>
  );
}

/** The page has dots for the Labels selector to switch: a tool, the names chart, or notes in its text. */
const hasDots = (blocks: ArticleBlock[]) => blocks.some((b) => b.type === "exercise" || b.type === "row" || b.type === "names" || JSON.stringify(b).includes("{{"));

/** What `ArticleBody` draws: an article's blocks and the settings they are drawn with (a /learn article, or a course section written in its style). */
export type ArticleBodyProps = Pick<Article, "blocks" | "labels" | "frets"> & { sings?: boolean; topics?: Article["topics"] };

/**
 * An article's blocks in order, the singing tools under one Your voice picker, the Labels selector after them when the page
 * has dots, then `children` (the updated line, the ending). Glossary words are marked once each across the whole body. Used by
 * /learn and by the course's sections written in the same style (`CourseSection.article`).
 */
export function ArticleBody({ article, children }: { article: ArticleBodyProps; children?: ReactNode }) {
  const marked = markArticle(article);
  const roots = blockRoots(article);
  const body = (
    // the plan reader's text is 18px from sm up, its inline note dots 1.9em of that: the same 34px here on 16px text
    <div className="flex flex-col gap-4 leading-relaxed sm:[--note-dot:2.15em]">
      {article.blocks.map((b, i) => <Fragment key={i}><Block block={b} lines={marked[i]} root={roots[i]} /></Fragment>)}
      {hasDots(article.blocks) && <div className="mt-8"><LabelSwitch /></div>}
      {children}
    </div>
  );
  const page = article.sings ? <VoicePicker data={article.blocks}>{body}</VoicePicker> : body;
  const framed = article.frets ? <NeckFrets to={article.frets}>{page}</NeckFrets> : page;
  // every dot starts as the article's labels (Solfège for singing, Intervals for guitar), whatever the reader's setting; the selector at the bottom switches them
  return <ArticleLabels initial={articleLabels({ labels: article.labels, topics: article.topics ?? (article.sings ? ["singing"] : ["guitar"]) })}>{framed}</ArticleLabels>;
}

/** A /learn article's body, ending on the updated date, the join card and two more guides. */
export default function ArticleView({ article }: { article: Article }) {
  return (
    <ArticleBody article={article}>
      <p className="mt-2 text-xs text-slate-500">Updated {new Date(`${article.updated}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.</p>
      <JoinCard />
      <MoreGuides current={article.slug} />
    </ArticleBody>
  );
}
