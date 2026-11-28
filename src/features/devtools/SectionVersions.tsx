import type { CourseSection } from "@/features/course/model";
import { devUi } from "./gate";
import VersionLine, { type VersionPart } from "./VersionLine";
import { RECORDED_IN } from "./versionDocs";

/** The versions an article or a course section was written to; `null`: none recorded. */
export type Written = { agents: number; teaching: number; voice: number } | null;

/** An article's or a course section's versions as a line's parts: agents, teaching, voice. */
export const articleParts = (v: Written): VersionPart[] => [
  ["agents", v?.agents ?? null],
  ["teaching", v?.teaching ?? null],
  ["voice", v?.voice ?? null],
];

/**
 * In development only (`devUi`): a course section's slug and the versions it was written to, at the top of its page and,
 * `compact` (no slug), under its title in the course index. A section written as a /learn article records them in its
 * lessons file; one still in course blocks was written before versions were kept and shows none; a planned one has no
 * text yet. Reads no file, so the index (client code) can draw it.
 */
export default function SectionVersions({ section, compact = false }: { section: CourseSection; compact?: boolean }) {
  if (!devUi()) return null;
  const { article, slug, blocks } = section;
  if (article) return <VersionLine id={compact ? undefined : slug} idTitle={RECORDED_IN.lesson(slug)} parts={articleParts(article.versions)} recordedIn={RECORDED_IN.lesson(slug)} />;
  const kind = blocks.length ? "course blocks" : "planned";
  const why = blocks.length
    ? "Not recorded: this section is still course blocks in src/features/course/stages, written before versions were kept"
    : "Not recorded: this section is planned, with no text yet";
  return <VersionLine id={compact ? kind : `${slug} · ${kind}`} idTitle={why} parts={compact ? [] : articleParts(null)} recordedIn={why} />;
}
