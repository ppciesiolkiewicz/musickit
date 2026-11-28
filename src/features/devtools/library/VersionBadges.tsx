import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";

/** The versions a plan or block was written to; `null` when it was not recorded. */
export type WrittenTo = { prompt: number | null; agents: number | null; teaching: number | null };

const DOCS: { key: keyof WrittenTo; now: number; what: string }[] = [
  { key: "prompt", now: PROMPT_VERSION, what: "The plan prompt" },
  { key: "agents", now: DOC_VERSIONS.agents, what: "AGENTS.md" },
  { key: "teaching", now: DOC_VERSIONS.teaching, what: "The teaching skills" },
];

/** One badge: `prompt 25/25`. Green when current, amber when behind, grey `—/25` when not recorded. */
function VersionBadge({ name, v, now, what }: { name: string; v: number | null; now: number; what: string }) {
  const cls = v === null ? "border-slate-600 bg-slate-700/30 text-slate-400" : v < now ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-lime-500/40 bg-lime-500/10 text-lime-200";
  const title = v === null ? `${what}: version not recorded; now ${now}` : v < now ? `${what}: written to ${v}, now ${now} (behind)` : `${what}: written to ${v}, the current version`;
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full border px-1.5 align-middle text-[10px] leading-4 ${cls}`}>
      <span className="font-medium uppercase tracking-wider opacity-75">{name}</span>
      <span className="font-mono tabular-nums">{v ?? "—"}/{now}</span>
    </span>
  );
}

/** The three versions as badges, prompt first. */
export default function VersionBadges({ v }: { v: WrittenTo }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {DOCS.map((d) => <VersionBadge key={d.key} name={d.key} v={v[d.key]} now={d.now} what={d.what} />)}
    </span>
  );
}
