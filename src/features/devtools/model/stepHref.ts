/** The page that renders a step's blocks, or one block (src/app/admin/content/block). Kept apart from stepBlocks.ts so a client
 *  view can link to it without loading the seed files. */
export const blockHref = (q: { step: string } | { id: string }): string =>
  "step" in q ? `/admin/content/block?step=${encodeURIComponent(q.step)}` : `/admin/content/block?id=${encodeURIComponent(q.id)}`;
