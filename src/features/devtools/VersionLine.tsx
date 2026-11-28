import { versionTitle, type VersionKey } from "./versionDocs";

/** One version of a line: the document, the version written to (`null`: not recorded) and the version now. */
export type VersionPart = [key: VersionKey, was: number | null, now: number];

/**
 * The dev line of something written to versioned rules (a seed block's card, a /learn article, a course section): its id
 * and each version it was written to, one behind shown with the version now (`teaching 13 → 16`), in the fuchsia of the
 * other dev marks. Without an `id` only the versions show; without `parts` only the id. Hovering a label lists the files responsible for that version (`versionTitle`). The caller gates it
 * with `devUi`.
 */
export default function VersionLine({ id, idTitle, parts, recordedIn }: { id?: string; idTitle?: string; parts: VersionPart[]; recordedIn?: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-1.5 font-mono text-[10px]">
      {id && <span title={idTitle} className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-300">{id}</span>}
      {parts.map(([key, was, now]) => (
        <span key={key} title={versionTitle(key, was, now, recordedIn)} className={`cursor-help ${was === now ? "text-fuchsia-300/60" : "text-amber-300"}`}>
          {key} {was ?? "—"}{was !== now ? ` → ${now}` : ""}
        </span>
      ))}
    </span>
  );
}
