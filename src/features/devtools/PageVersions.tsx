import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ARTICLE_VOICE_VERSION, type ArticleSeed } from "@/features/articles/model";
import type { CourseSection } from "@/features/course/model";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { devUi } from "./gate";
import VersionLine, { type VersionPart } from "./VersionLine";
import { RECORDED_IN } from "./versionDocs";

type Written = { agents: number; teaching: number; voice: number } | null;

const parts = (v: Written): VersionPart[] => [
  ["agents", v?.agents ?? null, DOC_VERSIONS.agents],
  ["teaching", v?.teaching ?? null, DOC_VERSIONS.teaching],
  ["voice", v?.voice ?? null, ARTICLE_VOICE_VERSION],
];

/**
 * In development only (`devUi`), at the top of a /learn article: its slug and the versions its seed file
 * (`articles/seeds/<slug>.json`) was written to, as a seed block's card shows them. Server only: it reads the file.
 */
export function ArticleVersions({ slug }: { slug: string }) {
  if (!devUi()) return null;
  const file = RECORDED_IN.article(slug);
  let v: Written = null;
  try {
    v = (JSON.parse(readFileSync(join(process.cwd(), file), "utf8")) as ArticleSeed).versions;
  } catch (e) {
    console.error(`[page-versions] could not read ${file}`, e);
  }
  return <VersionLine id={slug} idTitle={file} parts={parts(v)} recordedIn={v ? file : `Not recorded: ${file} could not be read`} />;
}

/**
 * In development only (`devUi`), at the top of a course section: its slug and the versions it was written to. A section
 * written as a /learn article records them in its lessons file; one still in course blocks was written before versions
 * were kept and shows none; a planned one has no text yet.
 */
export function SectionVersions({ section }: { section: CourseSection }) {
  if (!devUi()) return null;
  const { article, slug, blocks } = section;
  if (article) return <VersionLine id={slug} idTitle={RECORDED_IN.lesson(slug)} parts={parts(article.versions)} recordedIn={RECORDED_IN.lesson(slug)} />;
  const why = blocks.length
    ? "Not recorded: this section is still course blocks in src/features/course/stages, written before versions were kept"
    : "Not recorded: this section is planned, with no text yet";
  return <VersionLine id={`${slug} · ${blocks.length ? "course blocks" : "planned"}`} idTitle={why} parts={parts(null)} recordedIn={why} />;
}
