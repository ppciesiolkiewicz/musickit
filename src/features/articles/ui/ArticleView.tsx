import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import Explained from "@/components/course/Explained";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import { parseTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";
import { CareLine } from "@/features/plan/ui/reader/NoteText";
import { ARTICLES } from "../index";
import { AUTHOR } from "../author";
import { markArticle, type Mark } from "../marks";
import type { Article, ArticleBlock } from "../model";
import ArticleCard from "./ArticleCard";
import PlayerControls from "./PlayerControls";
import TempoTool from "./TempoTool";

/** One line of article text as marked runs (`markArticle`): bold, links, care lines, and the glossary's explained words, with no course link (the course needs a login). */
export function Inline({ runs }: { runs: Mark[] }) {
  return runs.map((r, k) =>
    r.kind === "link" ? <Link key={k} href={r.href} className="text-sky-300 underline-offset-2 hover:underline">{r.text}</Link>
    : r.kind === "bold" ? <strong key={k} className="font-semibold text-slate-50"><Explained pieces={r.pieces} link={false} /></strong>
    : r.kind === "care" ? <CareLine key={k}><Explained pieces={r.pieces} link={false} /></CareLine>
    : <Fragment key={k}><Explained pieces={r.pieces} link={false} /></Fragment>,
  );
}

function Block({ block, lines }: { block: ArticleBlock; /** the block's lines, marked (`markArticle`) */ lines: Mark[][] }) {
  switch (block.type) {
    case "p":
      return <p className="text-slate-300"><Inline runs={lines[0]} /></p>;
    case "h2":
      return <h2 className="mt-4 text-xl font-semibold text-slate-50">{block.text}</h2>;
    case "list":
      return <ul className="flex list-disc flex-col gap-1.5 pl-5 text-slate-300">{block.items.map((t, i) => <li key={t}><Inline runs={lines[i]} /></li>)}</ul>;
    case "care":
      return <p><CareLine><Inline runs={lines[0]} /></CareLine></p>;
    case "player":
      return <PlayerControls />;
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
    case "exercise": {
      const tool = parseTool(block.tool);
      return (
        <section aria-label={block.title} className="metal-panel mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-50">{block.title}</h2>
          {block.lines.map((t, i) => <p key={t} className="text-slate-300"><Inline runs={lines[i]} /></p>)}
          {tool && <div className="min-w-0">{tool.type === "melody-singer" || tool.type === "run-singer" ? <TempoTool tool={tool} /> : <Tool tool={tool} />}</div>}
          {block.after?.map((t, i) => <p key={t} className="text-slate-300"><Inline runs={lines[block.lines.length + i]} /></p>)}
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

/** An article's body: its blocks in order, the singing tools under one Your voice picker. Glossary words are marked once each across the whole article. */
export default function ArticleView({ article }: { article: Article }) {
  const marked = markArticle(article);
  const body = (
    <div className="flex flex-col gap-4 leading-relaxed">
      {article.blocks.map((b, i) => <Fragment key={i}><Block block={b} lines={marked[i]} /></Fragment>)}
      <p className="mt-2 text-xs text-slate-500">Updated {new Date(`${article.updated}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.</p>
      <JoinCard />
      <MoreGuides current={article.slug} />
    </div>
  );
  return article.sings ? <VoicePicker data={article.blocks}>{body}</VoicePicker> : body;
}
