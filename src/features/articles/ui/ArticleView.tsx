import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import { parseTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";
import { CareLine } from "@/features/plan/ui/reader/NoteText";
import { ARTICLES } from "../index";
import type { Article, ArticleBlock } from "../model";
import ArticleCard from "./ArticleCard";
import TempoTool from "./TempoTool";

/** `**bold**`, `[label](href)` and `_care line_` inside a line of article text. */
export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)|_(.+?)_/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const k = parts.length;
    if (m[1]) parts.push(<strong key={k} className="font-semibold text-slate-50">{m[1]}</strong>);
    else if (m[2]) parts.push(<Link key={k} href={m[3]} className="text-sky-300 underline-offset-2 hover:underline">{m[2]}</Link>);
    else parts.push(<CareLine key={k}>{m[4]}</CareLine>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-slate-300"><Inline text={block.text} /></p>;
    case "h2":
      return <h2 className="mt-4 text-xl font-semibold text-slate-50">{block.text}</h2>;
    case "list":
      return <ul className="flex list-disc flex-col gap-1.5 pl-5 text-slate-300">{block.items.map((t) => <li key={t}><Inline text={t} /></li>)}</ul>;
    case "care":
      return <p><CareLine>{block.text}</CareLine></p>;
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
          {block.lines.map((t) => <p key={t} className="text-slate-300"><Inline text={t} /></p>)}
          {tool && <div className="min-w-0">{tool.type === "melody-singer" || tool.type === "run-singer" ? <TempoTool tool={tool} /> : <Tool tool={tool} />}</div>}
          {block.after?.map((t) => <p key={t} className="text-slate-300"><Inline text={t} /></p>)}
        </section>
      );
    }
  }
}

/** The ending of every article: one line and the home page's main button. The words are here, not in the articles. */
export function JoinCard() {
  return (
    <aside aria-label="Join attunr" className="metal-panel mt-6 flex flex-col items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-slate-100">Join attunr for more interactive exercises and a curated practice plan for every day.</p>
      <Link href="/plan" className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400">Start your plan</Link>
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

/** An article's body: its blocks in order, the singing tools under one Your voice picker. */
export default function ArticleView({ article }: { article: Article }) {
  const body = (
    <div className="flex flex-col gap-4 leading-relaxed">
      {article.blocks.map((b, i) => <Fragment key={i}><Block block={b} /></Fragment>)}
      <p className="mt-2 text-xs text-slate-500">Updated {new Date(`${article.updated}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.</p>
      <JoinCard />
      <MoreGuides current={article.slug} />
    </div>
  );
  return article.sings ? <VoicePicker data={article.blocks}>{body}</VoicePicker> : body;
}
