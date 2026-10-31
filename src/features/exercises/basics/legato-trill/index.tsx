import { StubView } from "../stub";

/** Stub: the legato trill's settings in a placeholder box. */
export function View({ fingers, string, fret, bpm }: { fingers: string; string: number; fret: number; bpm: number }) {
  return <StubView name="legato trill" settings={[`fingers ${fingers.split("").join("-")}`, `string ${string}`, `from fret ${fret}`, `${bpm} bpm`]} />;
}
