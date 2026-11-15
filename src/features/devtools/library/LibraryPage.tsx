import type { BlockSummary, ConceptCoverage, CoverageRow, PlanSummary } from "@/features/library/server/types";
import type { LibraryResult } from "./load";
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
const versions = (p: { promptVersion: number | null; docsAgents: number | null; docsTeaching: number | null }) =>
  `prompt ${orDash(p.promptVersion)}, agents ${orDash(p.docsAgents)}, teaching ${orDash(p.docsTeaching)}`;

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

export function PlansTable({ plans }: { plans: PlanSummary[] }) {
  if (plans.length === 0) return <Muted>No plans.</Muted>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Model", "Versions", "Days", "Reviews"]} />
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className={ROW}>
              <td className="p-2">{p.title}</td>
              <td className="p-2">{orDash(p.provenance.model)}</td>
              <td className="p-2">{versions(p.provenance)}</td>
              <td className="p-2">{p.days}</td>
              <td className="p-2">{p.reviews.count === 0 ? "–" : `${p.reviews.count}, mean ${p.reviews.mean === null ? "–" : p.reviews.mean.toFixed(1)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlocksTable({ blocks }: { blocks: BlockSummary[] }) {
  if (blocks.length === 0) return <Muted>No blocks for this topic.</Muted>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-200">
        <Head cols={["Title", "Level", "Concepts", "Model", "Versions", "Times", "Minutes", "1 star", "2 stars", "3 stars", "4 stars", "5 stars"]} />
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id} className={ROW}>
              <td className="p-2">{b.title}</td>
              <td className="p-2">{orDash(b.level)}</td>
              <td className="p-2">{b.concepts.join(", ") || "–"}</td>
              <td className="p-2">{orDash(b.provenance.model)}</td>
              <td className="p-2">{versions(b.provenance)}</td>
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

/** The library as bare tables. Takes what `loadLibrary` returned, so every failure shows here and nothing throws. */
export default function LibraryPage({ result, params }: { result: LibraryResult; params: LibraryParams }) {
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
      <PlansTable plans={data.plans} />
      <H>{params.topic === undefined ? "Blocks" : `Blocks for ${params.topic}`}</H>
      {data.blocks === null ? <Muted>Choose a topic in the coverage table.</Muted> : <BlocksTable blocks={data.blocks} />}
    </div>
  );
}
