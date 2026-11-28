import data from "@/features/library/seed/nearCopies.json";

/**
 * TEMPORARY, while the library is thinned: the near-copy groups `scripts/near-copies.ts` found (seed blocks that look
 * like the same drill at another level, to fold into one block with choices). /admin/content/library/blocks shows them
 * as a filter (`?group=`). Delete this file, the JSON, the script and the filter once the folding is done.
 */
export interface NearCopyGroup {
  id: string;
  /** the first block id, by id */
  label: string;
  blocks: string[];
  /** the highest similarity of a pair in the group */
  best: number;
}

export const NEAR_COPY_GROUPS: NearCopyGroup[] = (data.groups as NearCopyGroup[]).map(({ id, label, blocks, best }) => ({ id, label, blocks, best }));

/** How the groups were found, for the page's line. */
export const NEAR_COPY_METHOD: { method: string | null; model: string | null; threshold: number | null } = { method: data.method, model: data.model, threshold: data.threshold };

const BY_BLOCK = new Map(NEAR_COPY_GROUPS.flatMap((g) => g.blocks.map((b) => [b, g.id] as const)));

/** The near-copy group a block is in, or undefined. */
export const nearCopyGroupOf = (blockId: string): string | undefined => BY_BLOCK.get(blockId);

export const nearCopyGroup = (id: string | undefined): NearCopyGroup | undefined => (id === undefined ? undefined : NEAR_COPY_GROUPS.find((g) => g.id === id));
