import type { BlockChoice, BlockSummary, ConceptCoverage, CoverageRow } from "@/features/library/server/types";
import type { ItemResult, LibraryResult } from "./load";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { SEED_BLOCKS, SEED_PLANS, type SeedPlanFile } from "@/features/library/seed";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { blockTags, planTags, seedBlocksById, type LibraryTag } from "./item";
import LibraryItem, { SeedSections } from "./LibraryItem";
import ScrollToItem from "./ScrollToItem";
import { libraryHref, minutes, orDash, type LibraryParams } from "./params";

const TH = "p-2";
const ROW = "border-t border-slate-800 align-top";
const LINK = "text-sky-300 underline hover:text-sky-200";
const Muted = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-slate-400">{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 mt-8 text-base font-semibold text-slate-100">{children}</h2>;
const Head = ({ cols }: { cols: string[] }) => (
  <thead className="text-xs uppercase text-slate-400">
    <tr>{cols.map((c) => <th key={c} className={TH}>{c}</th>)}</tr>
  </thead>
);
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
};

/** Small tags after a title: where the row comes from and whether players are offered it. */
const Tags = ({ tags }: { tags: LibraryTag[] }) => (
  <>
    {tags.map((t) => (
      <span key={t} className={`ml-2 rounded-full border px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</span>
    ))}
  </>
);

export function CoverageTable({ rows, params }: { rows: CoverageRow[]; params: LibraryParams }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Topic", "Level", "Blocks", "Times", "Minutes"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.topic}:${r.level}`} className={ROW}>
              <td className="p-2"><a className={LINK} href={libraryHref(params, { topic: r.topic })}>{r.topic}</a></td>
              <td className="p-2">{r.level}</td>
              <td className="p-2">{r.blocks}</td>
              <td className="p-2">{r.times}</td>
              <td className="p-2">{minutes(r.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConceptTable({ rows }: { rows: ConceptCoverage[] }) {
  return (
    <div className="overflow-x-auto">
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
    </div>
  );
}

/** A row's title as a link that draws it below the tables; the open one is marked. */
function ItemLink({ id, title, params }: { id: string; title: string; params: LibraryParams }) {
  if (params.item === id) return <span className="font-semibold text-slate-100">{title || id}</span>;
  return <a className={LINK} href={`${libraryHref(params, { item: id })}#item`}>{title || id}</a>;
}

/** The plans, read from their files (no plan is stored in the database), each tagged; each links to its drawing below the tables. `off` holds the ids not enabled for reuse. */
export function PlansTable({ plans = SEED_PLANS, off = new Set<string>(), params }: { plans?: SeedPlanFile[]; off?: ReadonlySet<string>; params: LibraryParams }) {
  const seedIds = new Set(plans.map((f) => f.id));
  if (plans.length === 0) return <Muted>No seed plans.</Muted>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Model", "Versions", "Days"]} />
        <tbody>
          {plans.map((f) => (
            <tr key={f.id} className={ROW}>
              <td className="p-2"><ItemLink id={f.id} title={typeof f.plan.title === "string" ? f.plan.title : f.id} params={params} /><Tags tags={planTags(f.id, seedIds, off)} /></td>
              <td className="p-2">{f.model}</td>
              <td className="p-2"><Versions p={{ promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching }} /></td>
              <td className="p-2">{Array.isArray(f.plan.days) ? f.plan.days.length : 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
              <td className="p-2">{c.id === drawn ? <span className="font-semibold text-slate-100">{c.name}</span> : <a className={LINK} href={`${libraryHref(params, { item: c.id })}#item`}>{c.name}</a>}</td>
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

/** A block's choices as links that draw each; an inactive one is amber. */
function ChoiceLinks({ choices, params }: { choices: BlockChoice[]; params: LibraryParams }) {
  if (choices.length === 0) return <>–</>;
  return (
    <span>
      {choices.map((c, i) => (
        <span key={c.id}>
          {i > 0 && ", "}
          <a className={c.active ? LINK : "text-amber-300 underline"} title={c.active ? undefined : "inactive"} href={`${libraryHref(params, { item: c.id })}#item`}>{c.name}</a>
        </span>
      ))}
    </span>
  );
}

export function BlocksTable({ blocks, params }: { blocks: BlockSummary[]; params: LibraryParams }) {
  if (blocks.length === 0) return <Muted>No blocks for this topic.</Muted>;
  const hashed = seedBlocksById();
  const curated = new Set(SEED_BLOCKS.map((f) => f.id));
  const seed = { has: (id: string) => curated.has(id) || hashed.has(id) };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Choices", "Level", "Concepts", "Model", "Versions", "Times", "Minutes", "1 star", "2 stars", "3 stars", "4 stars", "5 stars"]} />
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id} className={ROW}>
              <td className="p-2"><ItemLink id={b.id} title={b.title} params={params} /><Tags tags={blockTags(b, seed)} /></td>
              <td className="p-2"><ChoiceLinks choices={b.choices} params={params} /></td>
              <td className="p-2">{orDash(b.level)}</td>
              <td className="p-2">{b.concepts.join(", ") || "–"}</td>
              <td className="p-2">{orDash(b.provenance.model)}</td>
              <td className="p-2"><Versions p={b.provenance} /></td>
              <td className="p-2">{b.use.times}</td>
              <td className="p-2">{minutes(b.use.seconds)}</td>
              {b.use.stars.map((n, i) => <td key={i} className="p-2">{n}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The plan, block or choice in `?item=`, drawn (a block's choices listed above it), or a line saying it was not found. */
function Item({ result, params }: { result: ItemResult; params: LibraryParams }) {
  if (result.state === "none") return null;
  return (
    <section id="item" className="scroll-mt-4">
      <ScrollToItem />
      <H>
        Drawn{" "}
        <a className="ml-2 text-xs font-normal text-sky-300 underline hover:text-sky-200" href={libraryHref(params, { item: undefined })}>close</a>
      </H>
      {result.state === "found" ? (
        <>
          {result.item.choices && <ChoicesTable choices={result.item.choices} drawn={result.item.choiceId} params={params} />}
          <LibraryItem item={result.item} />
        </>
      ) : (
        <div>
          <Muted>Not found: no seed file and no block in the database with id {result.id}.</Muted>
          {result.message !== undefined && <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{result.message}</pre>}
        </div>
      )}
    </section>
  );
}

/**
 * The library as bare tables, then the row picked in `?item=` drawn. Takes what `loadLibrary` and `loadItem` returned,
 * so every failure shows here and nothing throws.
 */
export default function LibraryPage({ result, item, params }: { result: LibraryResult; item: ItemResult; params: LibraryParams }) {
  return (
    <div>
      <SeedSections />
      <p className="mb-3 text-sm text-slate-400">
        Where this page reads from: the tables come from the database, through the same queries the MCP tools use. The
        item you open (<code>?item=</code>) comes from its seed file in <code>src/features/library/seed</code> if one has
        that id, and from the database if not.
      </p>
      <Tables result={result} params={params} />
      <Item result={item} params={params} />
    </div>
  );
}

function Tables({ result, params }: { result: LibraryResult; params: LibraryParams }) {
  if (result.state === "no-database") return <Muted>No database: set DATABASE_URL to read the library.</Muted>;
  if (result.state === "failed") {
    return (
      <div>
        <Muted>The library could not be read.</Muted>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{result.message}</pre>
      </div>
    );
  }
  const { data } = result;
  return (
    <div>
      {data.scopeError !== null && <p className="mb-3 text-sm text-red-300">{data.scopeError}. Shown without a player.</p>}
      <p className="mb-3 text-sm text-slate-400">
        Player: {params.player ?? "none"} (add <code>?player=</code> and a user id).
      </p>
      <p className="mb-3 text-sm text-slate-400">
        Every block and plan is listed. Seed: from a seed file. Database only: no seed file (a player&apos;s or the AI&apos;s). Off: not offered to players.
      </p>
      <H>Coverage by topic and level</H>
      <CoverageTable rows={data.topics} params={params} />
      <H>Coverage by concept</H>
      <ConceptTable rows={data.concepts} />
      <H>Seed plans</H>
      <Muted>Read from src/features/library/seed/plans. Plans are not stored in the database.</Muted>
      <PlansTable params={params} />
      <H>{params.topic === undefined ? "Blocks" : `Blocks for ${params.topic}`}</H>
      {data.blocks === null ? <Muted>Choose a topic in the coverage table.</Muted> : <BlocksTable blocks={data.blocks} params={params} />}
    </div>
  );
}
