import { VersionPill } from "./VersionPills";
import type { VersionKey } from "./versionDocs";

/** One version of a line: the document and the version written to (`null`: not recorded). The pill reads the version now itself. */
export type VersionPart = [key: VersionKey, was: number | null];

/**
 * The dev line of something written to versioned rules (a seed block's card, a /learn article, a course section): its id
 * in the fuchsia of the other dev marks, then each version it was written to as a pill (`VersionPills.tsx`). Without an
 * `id` only the pills show; without `parts` only the id. The caller gates it with `devUi`.
 */
export default function VersionLine({ id, idTitle, parts, recordedIn }: { id?: string; idTitle?: string; parts: VersionPart[]; recordedIn?: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px]">
      {id && <span title={idTitle} className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-300">{id}</span>}
      {parts.map(([key, was]) => <VersionPill key={key} name={key} was={was} recordedIn={recordedIn} />)}
    </span>
  );
}
