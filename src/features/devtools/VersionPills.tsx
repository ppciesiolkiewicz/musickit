import { ARTICLE_VOICE_VERSION } from "@/features/articles/model";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { PROMPT_VERSION } from "@/features/plan/model/promptVersion";
import { versionTitle, type VersionKey } from "./versionDocs";

/** The version each document is at now, read from where it is kept. Light imports only, so client code can draw the pills. */
export const VERSION_NOW: Record<VersionKey, number> = {
  prompt: PROMPT_VERSION,
  agents: DOC_VERSIONS.agents,
  teaching: DOC_VERSIONS.teaching,
  voice: ARTICLE_VOICE_VERSION,
};

/** What a pill is given: the version the thing was written to (`null`: not recorded) and the file that records it, for the hover text. */
export interface PillProps { was: number | null; recordedIn?: string }

/**
 * One version as a pill, `teaching 12/13`: green when current, amber when behind, grey `—/13` when not recorded. It reads
 * the version now itself (`VERSION_NOW`). Hovering it lists the files responsible for that version (`versionTitle`).
 */
export function VersionPill({ name, was, recordedIn }: PillProps & { name: VersionKey }) {
  const now = VERSION_NOW[name];
  const cls = was === null ? "border-slate-600 bg-slate-700/30 text-slate-400" : was < now ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-lime-500/40 bg-lime-500/10 text-lime-200";
  return (
    <span title={versionTitle(name, was, now, recordedIn)} className={`inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-full border px-1.5 align-middle text-[10px] leading-4 ${cls}`}>
      <span className="font-medium uppercase tracking-wider opacity-75">{name}</span>
      <span className="font-mono tabular-nums">{was ?? "—"}/{now}</span>
    </span>
  );
}

/** The plan prompt's version (`PROMPT_VERSION`) a seed block or plan was written to. */
export const PromptVersionPill = (p: PillProps) => <VersionPill name="prompt" {...p} />;
/** AGENTS.md's version (`DOC_VERSIONS.agents`). */
export const AgentsVersionPill = (p: PillProps) => <VersionPill name="agents" {...p} />;
/** The teaching skills' shared version, the teaching style (`DOC_VERSIONS.teaching`). */
export const TeachingStyleVersionPill = (p: PillProps) => <VersionPill name="teaching" {...p} />;
/** The articles' voice (`ARTICLE_VOICE_VERSION`), for a /learn article or a course section written in its style. */
export const ArticleVoiceVersionPill = (p: PillProps) => <VersionPill name="voice" {...p} />;
