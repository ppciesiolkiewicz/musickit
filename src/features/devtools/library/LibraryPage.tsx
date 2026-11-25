import Link from "next/link";
import type { ReactNode } from "react";
import type { BlockChoice, BlockSummary, ConceptCoverage, CoverageRow } from "@/features/library/server/types";
import type { BlocksData, CoverageData, ItemResult, Loaded, TopicCount } from "./load";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { SEED_BLOCKS, SEED_PLANS, type SeedPlanFile } from "@/features/library/seed";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { blockOfChoice } from "@/features/plan/model/blockId";
import { blockTags, demoSlugOf, seedBlocksById, type LibraryTag } from "./item";
import LibraryItem, { SeedSections } from "./LibraryItem";
import ScrollToItem from "./ScrollToItem";
import { libraryHref, minutes, orDash, type LibraryParams, type LibraryTab } from "./params";

const TH = "p-2";
const ROW = "border-t border-slate-800 align-top";
const LINK = "text-sky-300 underline hover:text-sky-200";
const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-slate-400">{children}</p>;
const H = ({ children }: { children: ReactNode }) => <h2 className="mb-2 mt-8 text-base font-semibold text-slate-100">{children}</h2>;
const Head = ({ cols }: { cols: string[] }) => (
  <thead className="text-xs uppercase text-slate-400">
    <tr>{cols.map((c) => <th key={c} className={TH}>{c}</th>)}</tr>
  </thead>
);
/** A table that scrolls sideways on its own; an open row's content stays the width of the screen (`100cqw`). */
const Scroll = ({ children }: { children: ReactNode }) => <div className="@container overflow-x-auto">{children}</div>;

/** Each version the row was written to; one older than the current one is amber, one not recorded is grey. */
function Versions({ p }: { p: { promptVersion: number | null; docsAgents: number | null; docsTeaching: number | null } }) {
  const parts: [string, number | null, number][] = [
    ["prompt", p.promptVersion, PROMPT_VERSION],
    ["agents", p.docsAgents, DOC_VERSIONS.agents],
    ["teaching", p.docsTeaching, DOC_VERSIONS.teaching],
  ];
  return (
    <span className="whitespace-nowrap">
      {parts.map(([name, v, now], i) => (
        <span key={name}>
          {i > 0 && ", "}
          <span className={v === null ? "text-slate-500" : v < now ? "text-amber-300" : undefined} title={v !== null && v < now ? `behind: now ${now}` : undefined}>
            {name} {orDash(v)}
          </span>
        </span>
      ))}
    </span>
  );
}

const TAG_STYLE: Record<LibraryTag, { label: string; cls: string }> = {
  seed: { label: "Seed", cls: "border-sky-500/40 bg-sky-500/10 text-sky-200" },
  database: { label: "Database only", cls: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
  off: { label: "Off", cls: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  demo: { label: "Demo", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
  riff: { label: "Edited in the app", cls: "border-violet-500/40 bg-violet-500/10 text-violet-200" },
};

const TAG = "ml-2 rounded-full border px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider";

/** Small tags after a title: where the row comes from and whether players are offered it. A Demo tag links to its demo page. */
const Tags = ({ tags, demo }: { tags: LibraryTag[]; demo?: string | null }) => (
  <>
    {tags.map((t) =>
      t === "demo" && demo ? (
        <a key={t} href={`/demo/${demo}`} title={`/demo/${demo}`} className={`${TAG} hover:underline ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</a>
      ) : (
        <span key={t} className={`${TAG} ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</span>
      ),
    )}
  </>
);

/* ---- tabs ---- */

const TABS: { tab: LibraryTab; label: string }[] = [
  { tab: "overview", label: "Overview" },
  { tab: "plans", label: "Plans" },
  { tab: "blocks", label: "Blocks" },
];

/** The library's subpages, the open one marked; the player carries over. */
export function LibraryTabs({ tab, params }: { tab: LibraryTab; params: LibraryParams }) {
  return (
    <nav aria-label="Library" className="mb-4 flex gap-1 border-b border-slate-800">
      {TABS.map((t) => (
        <Link
          key={t.tab}
          href={libraryHref(t.tab, { player: params.player })}
          aria-current={t.tab === tab ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${t.tab === tab ? "border-sky-400 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/* ---- an item opened in its row ---- */

/** A title that opens its item under its row, or closes it when it is the open one. Stays where it is on the page. */
function ItemLink({ tab, id, title, open, params }: { tab: LibraryTab; id: string; title: string; open: boolean; params: LibraryParams }) {
  return (
    <Link
      scroll={false}
      aria-expanded={open}
      className={open ? "font-semibold text-slate-100 hover:text-sky-200" : LINK}
      href={libraryHref(tab, params, { item: open ? undefined : id })}
    >
      <span aria-hidden className="mr-1 inline-block w-3 text-slate-500">{open ? "▾" : "▸"}</span>
      {title || id}
    </Link>
  );
}

/** The open item's row, right under the row it belongs to: as wide as the screen, whatever the table's width. */
function OpenRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr id="item" className="scroll-mt-4">
      <td colSpan={cols} className="p-0 pb-4">
        <div className="sticky left-0 w-[100cqw] pt-1">
          <ScrollToItem />
          {children}
        </div>
      </td>
    </tr>
  );
}

/** The plan, block or choice in `?item=`, drawn (a block's choices listed above it), or a line saying it was not found. */
export function Opened({ result, params }: { result: ItemResult; params: LibraryParams }) {
  if (result.state === "none") return null;
  if (result.state === "not-found") {
    return (
      <div>
        <Muted>Not found: no seed file and no block in the database with id {result.id}.</Muted>
        {result.message !== undefined && <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{result.message}</pre>}
      </div>
    );
  }
  return (
    <>
      {result.item.choices && <ChoicesTable choices={result.item.choices} drawn={result.item.choiceId} params={params} />}
      <LibraryItem item={result.item} />
    </>
  );
}

/** An open item no row on the page holds (a block of another topic, a seed block not in the database): drawn above the table. */
function Unplaced({ result, params, tab }: { result: ItemResult; params: LibraryParams; tab: LibraryTab }) {
  return (
    <section id="item" className="mb-6 scroll-mt-4">
      <ScrollToItem />
      <H>
        Open: {params.item}{" "}
        <Link scroll={false} className="ml-2 text-xs font-normal text-sky-300 underline hover:text-sky-200" href={libraryHref(tab, params, { item: undefined })}>close</Link>
      </H>
      <Opened result={result} params={params} />
    </section>
  );
}

/* ---- tables ---- */

export function CoverageTable({ rows, params }: { rows: CoverageRow[]; params: LibraryParams }) {
  return (
    <Scroll>
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Topic", "Level", "Blocks", "Times", "Minutes"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.topic}:${r.level}`} className={ROW}>
              <td className="p-2"><Link className={LINK} href={libraryHref("blocks", params, { topic: r.topic })}>{r.topic}</Link></td>
              <td className="p-2">{r.level}</td>
              <td className="p-2">{r.blocks}</td>
              <td className="p-2">{r.times}</td>
              <td className="p-2">{minutes(r.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

export function ConceptTable({ rows }: { rows: ConceptCoverage[] }) {
  return (
    <Scroll>
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Concept", "Blocks", "Times", "Minutes"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.concept} className={ROW}>
              <td className="p-2">{r.concept}</td>
              <td className="p-2">{r.blocks}</td>
              <td className="p-2">{r.times}</td>
              <td className="p-2">{minutes(r.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

const PLAN_COLS = ["Title", "Model", "Versions", "Days"];

/**
 * The plans, read from their files (no plan is stored in the database), each tagged Seed, and Demo when `/demo` shows
 * it. A title opens the plan under its row; `open` is what that row shows.
 */
export function PlansTable({ plans = SEED_PLANS, params, open }: { plans?: SeedPlanFile[]; params: LibraryParams; open?: ReactNode }) {
  if (plans.length === 0) return <Muted>No seed plans.</Muted>;
  return (
    <Scroll>
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={PLAN_COLS} />
        <tbody>
          {plans.map((f) => {
            const demo = demoSlugOf(f.id);
            const isOpen = params.item === f.id;
            return [
              <tr key={f.id} className={ROW}>
                <td className="p-2"><ItemLink tab="plans" id={f.id} title={typeof f.plan.title === "string" ? f.plan.title : f.id} open={isOpen} params={params} /><Tags tags={demo ? ["seed", "demo"] : ["seed"]} demo={demo} /></td>
                <td className="p-2">{f.model}</td>
                <td className="p-2"><Versions p={{ promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching }} /></td>
                <td className="p-2">{Array.isArray(f.plan.days) ? f.plan.days.length : 0}</td>
              </tr>,
              isOpen && open ? <OpenRow key={`${f.id}:open`} cols={PLAN_COLS.length}>{open}</OpenRow> : null,
            ];
          })}
        </tbody>
      </table>
    </Scroll>
  );
}

/** A block's choices, one per line: its name (a link that draws it; the drawn one marked), level, steps, minutes, active or not. */
export function ChoicesTable({ choices, drawn, params }: { choices: BlockChoice[]; drawn?: string; params: LibraryParams }) {
  if (choices.length === 0) return null;
  return (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Choice", "Level", "Steps", "Minutes", "Status"]} />
        <tbody>
          {choices.map((c) => (
            <tr key={c.id} className={ROW}>
              <td className="p-2">{c.id === drawn ? <span className="font-semibold text-slate-100">{c.name}</span> : <Link scroll={false} className={LINK} href={libraryHref("blocks", params, { item: c.id })}>{c.name}</Link>}</td>
              <td className="p-2">{orDash(c.level)}</td>
              <td className="p-2">{c.steps.join(", ") || "–"}</td>
              <td className="p-2">{c.minutes}</td>
              <td className={`p-2 ${c.active ? "" : "text-amber-300"}`}>{c.active ? "active" : "inactive"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A block's choices as links that open each under the block's row; an inactive one is amber. */
function ChoiceLinks({ choices, params }: { choices: BlockChoice[]; params: LibraryParams }) {
  if (choices.length === 0) return <>–</>;
  return (
    <span>
      {choices.map((c, i) => (
        <span key={c.id}>
          {i > 0 && ", "}
          <Link scroll={false} className={c.active ? LINK : "text-amber-300 underline"} title={c.active ? undefined : "inactive"} href={libraryHref("blocks", params, { item: c.id })}>{c.name}</Link>
        </span>
      ))}
    </span>
  );
}

const BLOCK_COLS = ["Title", "Choices", "Level", "Concepts", "Model", "Versions", "Times", "Minutes", "1 star", "2 stars", "3 stars", "4 stars", "5 stars"];

/** The block a `?item=` opens: the block itself, or the block of a choice id. */
export const openBlockId = (item: string | undefined): string | undefined => (item === undefined ? undefined : blockOfChoice(item) ?? item);

/** The blocks of a topic. A title opens the block under its row; `open` is what that row shows. */
export function BlocksTable({ blocks, params, open, riffEdited = [] }: { blocks: BlockSummary[]; params: LibraryParams; open?: ReactNode; riffEdited?: string[] }) {
  if (blocks.length === 0) return <Muted>No blocks for this topic.</Muted>;
  const hashed = seedBlocksById();
  const curated = new Set(SEED_BLOCKS.map((f) => f.id));
  const seed = { has: (id: string) => curated.has(id) || hashed.has(id) };
  const openId = openBlockId(params.item);
  const edited = new Set(riffEdited);
  return (
    <Scroll>
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={BLOCK_COLS} />
        <tbody>
          {blocks.map((b) => {
            const isOpen = openId === b.id;
            return [
              <tr key={b.id} className={ROW}>
                <td className="p-2"><ItemLink tab="blocks" id={b.id} title={b.title} open={isOpen} params={params} /><Tags tags={blockTags(b, seed, edited)} /></td>
                <td className="p-2"><ChoiceLinks choices={b.choices} params={params} /></td>
                <td className="p-2">{orDash(b.level)}</td>
                <td className="p-2">{b.concepts.join(", ") || "–"}</td>
                <td className="p-2">{orDash(b.provenance.model)}</td>
                <td className="p-2"><Versions p={b.provenance} /></td>
                <td className="p-2">{b.use.times}</td>
                <td className="p-2">{minutes(b.use.seconds)}</td>
                {b.use.stars.map((n, i) => <td key={i} className="p-2">{n}</td>)}
              </tr>,
              isOpen && open ? <OpenRow key={`${b.id}:open`} cols={BLOCK_COLS.length}>{open}</OpenRow> : null,
            ];
          })}
        </tbody>
      </table>
    </Scroll>
  );
}

/** Every topic with blocks as a link, the listed one marked. */
function TopicPicker({ topics, topic, params }: { topics: TopicCount[]; topic: string | null; params: LibraryParams }) {
  if (topics.length === 0) return <Muted>No blocks in the library.</Muted>;
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {topics.map((t) => (
        <Link
          key={t.topic}
          href={libraryHref("blocks", params, { topic: t.topic, item: undefined })}
          aria-current={t.topic === topic ? "page" : undefined}
          className={`rounded-full border px-2 py-0.5 text-xs ${t.topic === topic ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
        >
          {t.topic} <span className="text-slate-500">{t.blocks}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---- pages ---- */

/** What every library page has: the section hashes for the Notes bar, the tabs, the player line and the tags' key. */
function Frame({ tab, params, scopeError, canNamePlayer, children }: { tab: LibraryTab; params: LibraryParams; scopeError?: string | null; canNamePlayer: boolean; children: ReactNode }) {
  return (
    <div>
      <SeedSections />
      <LibraryTabs tab={tab} params={params} />
      {scopeError && <p className="mb-3 text-sm text-red-300">{scopeError}. Shown without a player.</p>}
      {tab !== "plans" && canNamePlayer && (
        <p className="mb-1 text-sm text-slate-400">
          Player: {params.player ?? "none"} (add <code>?player=</code> and a user id to add that player&apos;s own blocks).
        </p>
      )}
      <p className="mb-3 text-sm text-slate-400">
        Every seed block and plan is listed. Seed: from a seed file. Database only: no seed file. Off: a block that is not offered to players. Demo: a plan shown at /demo.
      </p>
      {children}
    </div>
  );
}

/** Why a page could not be read, or null when it was. */
function NotRead({ result }: { result: Loaded<unknown> }) {
  if (result.state === "no-database") return <Muted>No database: set DATABASE_URL to read the library.</Muted>;
  if (result.state === "failed") {
    return (
      <div>
        <Muted>The library could not be read.</Muted>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{result.message}</pre>
      </div>
    );
  }
  return null;
}

/** `/admin/content/library`: coverage by topic and level (each topic opens its blocks) and by concept, from the database. */
export function OverviewPage({ result, params, canNamePlayer = true }: { result: Loaded<CoverageData>; params: LibraryParams; canNamePlayer?: boolean }) {
  return (
    <Frame tab="overview" params={params} scopeError={result.state === "ok" ? result.scopeError : null} canNamePlayer={canNamePlayer}>
      <Muted>
        Read from the database, through the same queries the MCP tools use. Plans are read from their seed files; an item you
        open comes from its seed file in <code>src/features/library/seed</code> if one has that id, and from the database if not.
      </Muted>
      {result.state === "ok" ? (
        <>
          <H>Coverage by topic and level</H>
          <CoverageTable rows={result.data.topics} params={params} />
          <H>Coverage by concept</H>
          <ConceptTable rows={result.data.concepts} />
        </>
      ) : (
        <div className="mt-4"><NotRead result={result} /></div>
      )}
    </Frame>
  );
}

/** `/admin/content/library/plans`: the seed plans, the one in `?item=` open under its row. Needs no database. */
export function PlansPage({ item, params }: { item: ItemResult; params: LibraryParams }) {
  const inTable = params.item !== undefined && SEED_PLANS.some((p) => p.id === params.item);
  return (
    <Frame tab="plans" params={params} canNamePlayer={false}>
      <Muted>Read from src/features/library/seed/plans. Plans are not stored in the database.</Muted>
      {params.item !== undefined && !inTable && <Unplaced result={item} params={params} tab="plans" />}
      <div className="mt-4"><PlansTable params={params} open={<Opened result={item} params={params} />} /></div>
    </Frame>
  );
}

/** `/admin/content/library/blocks`: the topics, then the blocks of one with the block in `?item=` open under its row. */
export function BlocksPage({ result, item, params, canNamePlayer = true }: { result: Loaded<BlocksData>; item: ItemResult; params: LibraryParams; canNamePlayer?: boolean }) {
  const data = result.state === "ok" ? result.data : null;
  const shown = data ? { ...params, topic: data.topic ?? undefined } : params;
  const openId = openBlockId(params.item);
  const inTable = openId !== undefined && !!data?.blocks?.some((b) => b.id === openId);
  return (
    <Frame tab="blocks" params={params} scopeError={result.state === "ok" ? result.scopeError : null} canNamePlayer={canNamePlayer}>
      {data ? <TopicPicker topics={data.topics} topic={data.topic} params={shown} /> : <NotRead result={result} />}
      {params.item !== undefined && !inTable && <Unplaced result={item} params={shown} tab="blocks" />}
      {data && (
        <>
          <H>{data.topic === null ? "Blocks" : `Blocks for ${data.topic}`}</H>
          {data.blocks === null ? <Muted>Choose a topic above.</Muted> : <BlocksTable blocks={data.blocks} params={shown} riffEdited={data.riffEdited} open={<Opened result={item} params={shown} />} />}
        </>
      )}
    </Frame>
  );
}
