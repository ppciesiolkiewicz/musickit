import { THEORY_SECTIONS, type TheorySection } from "@/features/theory/sections";

/** The Practice page's groups, in order. */
export const TILE_GROUPS = ["Guitar", "Singing", "Play along", "Tuning & theory", "Learn"] as const;
export type TileGroup = (typeof TILE_GROUPS)[number];

/** The nav has the plan and the notes creator; Practice has the rest. */
const IN_NAV = "Plan & notes";

/** Where a page goes on Practice, from its menu group and column (or the Tools column it is also listed in). */
function groupOf(s: TheorySection): TileGroup | null {
  const toolsSub = s.group === "tools" ? s.sub : s.alsoIn?.find((a) => a.group === "tools")?.sub;
  if (toolsSub === IN_NAV) return null;
  if (s.group === "guitar") return "Guitar";
  if (s.group === "singing") return "Singing";
  if (toolsSub === "Play along") return "Play along";
  if (toolsSub) return "Tuning & theory";
  return "Learn";
}

/** Every page as a tile, grouped and in menu order. Read from `THEORY_SECTIONS`, so a new page there gets a tile. */
export function practiceTiles(): { label: TileGroup; tiles: TheorySection[] }[] {
  return TILE_GROUPS.map((label) => ({ label, tiles: THEORY_SECTIONS.filter((s) => groupOf(s) === label) }));
}
