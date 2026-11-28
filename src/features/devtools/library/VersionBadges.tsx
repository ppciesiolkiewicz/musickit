import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { versionTitle } from "../versionDocs";

/** The versions a plan or block was written to; `null` when it was not recorded. */
export type WrittenTo = { prompt: number | null; agents: number | null; teaching: number | null };

const DOCS: { key: keyof WrittenTo; now: number }[] = [
  { key: "prompt", now: PROMPT_VERSION },
  { key: "agents", now: DOC_VERSIONS.agents },
  { key: "teaching", now: DOC_VERSIONS.teaching },
];

/** One badge: `prompt 25/25`. Green when current, amber when behind, grey `—/25` when not recorded. Hovering it lists the files responsible for that version. */
function VersionBadge({ name, v, now, recordedIn }: { name: keyof WrittenTo; v: number | null; now: number; recordedIn?: string }) {
  const cls = v === null ? "border-slate-600 bg-slate-700/30 text-slate-400" : v < now ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-lime-500/40 bg-lime-500/10 text-lime-200";
  const title = versionTitle(name, v, now, recordedIn);
  return (
    <span title={title} className={`inline-flex cursor-help items-center gap-1 rounded-full border px-1.5 align-middle text-[10px] leading-4 ${cls}`}>
      <span className="font-medium uppercase tracking-wider opacity-75">{name}</span>
      <span className="font-mono tabular-nums">{v ?? "—"}/{now}</span>
    </span>
  );
}

/** The three versions as badges, prompt first: in a row, or one per line (`stacked`, for a table cell). `recordedIn`: the file that holds the written-to numbers, for the hover text. */
export default function VersionBadges({ v, stacked = false, recordedIn }: { v: WrittenTo; stacked?: boolean; recordedIn?: string }) {
  return (
    <span className={stacked ? "inline-flex flex-col items-start gap-1 whitespace-nowrap" : "inline-flex flex-wrap gap-1"}>
      {DOCS.map((d) => <VersionBadge key={d.key} name={d.key} v={v[d.key]} now={d.now} recordedIn={recordedIn} />)}
    </span>
  );
}
