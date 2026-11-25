// One-off: delete every amp model in the Vercel Blob store under `nam/`.
// Dry run by default (lists only); pass --yes to delete.
// Usage: node --env-file=.env.local scripts/delete-nam-blobs.mjs [--yes]
import { del, list } from "@vercel/blob";

const token = process.env.MUSICKIT_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("No MUSICKIT_BLOB_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN in the environment.");
  process.exit(1);
}

const blobs = [];
let cursor;
do {
  const page = await list({ prefix: "nam/", token, cursor });
  blobs.push(...page.blobs);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

for (const b of blobs) console.log(b.pathname, b.size);
console.log(`${blobs.length} file(s) under nam/`);

if (!process.argv.includes("--yes")) {
  console.log("Dry run. Run again with --yes to delete them.");
  process.exit(0);
}
if (blobs.length) await del(blobs.map((b) => b.url), { token });
console.log(`Deleted ${blobs.length} file(s).`);
