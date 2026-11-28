import { AgentsVersionPill, PromptVersionPill, TeachingStyleVersionPill } from "../VersionPills";

/** The versions a plan or block was written to; `null` when it was not recorded. */
export type WrittenTo = { prompt: number | null; agents: number | null; teaching: number | null };

/** A plan's or block's three versions as pills, prompt first: in a row, or one per line (`stacked`, for a table cell). `recordedIn`: the file that holds the written-to numbers, for the hover text. */
export default function VersionBadges({ v, stacked = false, recordedIn }: { v: WrittenTo; stacked?: boolean; recordedIn?: string }) {
  return (
    <span className={stacked ? "inline-flex flex-col items-start gap-1 whitespace-nowrap" : "inline-flex flex-wrap gap-1"}>
      <PromptVersionPill was={v.prompt} recordedIn={recordedIn} />
      <AgentsVersionPill was={v.agents} recordedIn={recordedIn} />
      <TeachingStyleVersionPill was={v.teaching} recordedIn={recordedIn} />
    </span>
  );
}
