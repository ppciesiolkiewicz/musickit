import type { Clef } from "@/features/theory/piano/staff";

/** The clef at the start of a singing staff, as SVG text centred on x 30; `yOf` maps a staff step to y. The tenor's treble has a small 8 under its tail. */
export default function ClefGlyph({ clef, yOf }: { clef: Clef; yOf: (step: number) => number }) {
  if (clef === "bass") return <text x={30} y={yOf(6) + 12} fontSize={42}>𝄢</text>;
  return (
    <>
      <text x={30} y={yOf(1) + 5} fontSize={62}>𝄞</text>
      {clef === "treble8" && <text x={27} y={yOf(-3) + 1} fontSize={12} fontWeight={700}>8</text>}
    </>
  );
}
