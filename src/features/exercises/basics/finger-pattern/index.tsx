import { StubView, stringsLabel } from "../stub";

/** Stub: the finger pattern's settings in a placeholder box. */
export function View({ fingers, fret, strings, bpm }: { fingers: string; fret: number; strings?: number[]; bpm: number }) {
  return <StubView name="finger pattern" settings={[`fingers ${fingers.split("").join("-")}`, `from fret ${fret}`, stringsLabel(strings), `${bpm} bpm`]} />;
}
