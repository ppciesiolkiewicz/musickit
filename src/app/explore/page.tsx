import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { PracticeTile } from "@/features/practice/PracticeTiles";
import { SignUpCorner, SignUpEnd, exploreTools } from "@/features/explore";
import type { TheorySection } from "@/features/theory/sections";

export const metadata: Metadata = {
  title: "Free Guitar Tools: Scales, Chords, CAGED, Tuner, Metronome, Looper · attunr",
  description: "Guitar scales and modes in every key, chord shapes, the CAGED system, a tuner, a metronome with a drone, a looper and a guitar course. Free to use, no account needed.",
  alternates: { canonical: "/explore" },
};

const HEADING = "mb-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300 metal-text";

function Tiles({ id, title, tiles, locked = false }: { id: string; title: string; tiles: TheorySection[]; locked?: boolean }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={HEADING}>{title}</h2>
      <ul className="grid grid-flow-dense grid-cols-3 gap-1.5 md:grid-cols-6">
        {tiles.map((t) => (
          <li key={t.href} className={t.wide ? "col-span-3 md:col-span-2" : ""}>
            <PracticeTile t={t} locked={locked} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The tools a visitor may use without an account, then the ones an account opens (src/lib/publicPaths.ts: OPEN_TOOLS and the course). */
export default function ExplorePage() {
  const { open, locked } = exploreTools();
  return (
    <PageShell
      active="/explore"
      title="Explore"
      intro="Tools you can use without an account: scales in every key, chords, CAGED shapes, a tuner, a metronome, a looper and the course."
      action={<SignUpCorner />}
      end={<SignUpEnd tools={false} />}
    >
      <div className="flex flex-col gap-8">
        <Tiles id="explore-open" title="Open without an account" tiles={open} />
        <Tiles id="explore-locked" title="With an account" tiles={locked} locked />
      </div>
    </PageShell>
  );
}
