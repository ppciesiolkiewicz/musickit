import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArticleSeed } from "@/features/articles/model";
import { devUi } from "./gate";
import { articleParts, type Written } from "./SectionVersions";
import VersionLine from "./VersionLine";
import { RECORDED_IN } from "./versionDocs";

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
  return <VersionLine id={slug} idTitle={file} parts={articleParts(v)} recordedIn={v ? file : `Not recorded: ${file} could not be read`} />;
}
