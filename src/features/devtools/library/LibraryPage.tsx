import type { BlockSummary, ConceptCoverage, CoverageRow, PlanSummary } from "@/features/library/server/types";
import type { ItemResult, LibraryResult } from "./load";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { SEED_PLANS } from "@/features/library/seed";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { seedBlocksById } from "./item";
import LibraryItem, { SeedSections } from "./LibraryItem";
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

/** A small "Seed" tag after a title whose row comes from a seed file in src/features/library/seed. */
const SeedTag = ({ seed }: { seed: boolean }) =>
  seed ? <span className="ml-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider text-sky-200">Seed</span> : null;

export function CoverageTable({ rows, params }: { rows: CoverageRow[]; params: LibraryParams }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Topic", "Level", "Blocks", "Plans", "Times", "Minutes"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.topic}:${r.level}`} className={ROW}>
              <td className="p-2"><a className={LINK} href={libraryHref(params, { topic: r.topic })}>{r.topic}</a></td>
              <td className="p-2">{r.level}</td>
              <td className="p-2">{r.blocks}</td>
              <td className="p-2">{r.plans}</td>
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
        <Head cols={["Concept", "Blocks", "Plans", "Times", "Minutes"]} />
        <tbody>
          {rows.map((r) => (
            <tr key={r.concept} className={ROW}>
              <td className="p-2">{r.concept}</td>
              <td className="p-2">{r.blocks}</td>
              <td className="p-2">{r.plans}</td>
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

export function PlansTable({ plans, params }: { plans: PlanSummary[]; params: LibraryParams }) {
  if (plans.length === 0) return <Muted>No plans.</Muted>;
  const seed = new Set(SEED_PLANS.map((f) => f.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Model", "Versions", "Days", "Reviews"]} />
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className={ROW}>
              <td className="p-2"><ItemLink id={p.id} title={p.title} params={params} /><SeedTag seed={seed.has(p.id)} /></td>
              <td className="p-2">{orDash(p.provenance.model)}</td>
              <td className="p-2"><Versions p={p.provenance} /></td>
              <td className="p-2">{p.days}</td>
              <td className="p-2">{p.reviews.count === 0 ? "–" : `${p.reviews.count}, mean ${p.reviews.mean === null ? "–" : p.reviews.mean.toFixed(1)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlocksTable({ blocks, params }: { blocks: BlockSummary[]; params: LibraryParams }) {
  if (blocks.length === 0) return <Muted>No blocks for this topic.</Muted>;
  const seed = seedBlocksById();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Level", "Concepts", "Model", "Versions", "Times", "Minutes", "1 star", "2 stars", "3 stars", "4 stars", "5 stars"]} />
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id} className={ROW}>
              <td className="p-2"><ItemLink id={b.id} title={b.title} params={params} /><SeedTag seed={seed.has(b.id)} /></td>
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

/** The plan or block in `?item=`, drawn, or a line saying it was not found. */
function Item({ result, params }: { result: ItemResult; params: LibraryParams }) {
  if (result.state === "none") return null;
  return (
    <section id="item" className="scroll-mt-4">
      <H>
        Drawn{" "}
        <a className="ml-2 text-xs font-normal text-sky-300 underline hover:text-sky-200" href={libraryHref(params, { item: undefined })}>close</a>
      </H>
      {result.state === "found" ? (
        <LibraryItem item={result.item} />
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
        Player: {params.player ?? "none"} (add <code>?player=</code> and a user id). Not enabled for reuse:{" "}
        {params.includeNotEnabled ? "included" : "left out"}
        {" "}<a className={LINK} href={libraryHref(params, { includeNotEnabled: !params.includeNotEnabled })}>{params.includeNotEnabled ? "leave out" : "include"}</a>
      </p>
      <H>Coverage by topic and level</H>
      <CoverageTable rows={data.topics} params={params} />
      <H>Coverage by concept</H>
      <ConceptTable rows={data.concepts} />
      <H>Plans</H>
      <PlansTable plans={data.plans} params={params} />
      <H>{params.topic === undefined ? "Blocks" : `Blocks for ${params.topic}`}</H>
      {data.blocks === null ? <Muted>Choose a topic in the coverage table.</Muted> : <BlocksTable blocks={data.blocks} params={params} />}
    </div>
  );
}
