import { replaceRuntimeInstruments, type RuntimeInstrument } from "@/features/sound";
import { engineId } from "./model/project";
import { INSTRUMENT_PREFIX, type SamplerProject } from "./model/types";
import type { SamplerStore } from "./store/types";
import { urlFor } from "./sampleUrls";

let token = 0;

/**
 * Makes the project's instruments playable in the sound engine, so every picker and player in the app can use them.
 * If a newer call starts while this one waits for the store, this one gives up.
 */
export async function syncInstruments(project: SamplerProject, store: SamplerStore): Promise<void> {
  const mine = ++token;
  const next: Record<string, RuntimeInstrument> = {};
  for (const inst of project.instruments) {
    const notes: Record<string, string> = {};
    for (const [note, sid] of Object.entries(inst.pads)) {
      const url = await urlFor(store, sid);
      if (url) notes[note] = url;
    }
    if (Object.keys(notes).length) next[engineId(inst.id)] = { label: inst.label, urls: notes, baseUrl: "", attack: inst.attack, release: inst.release };
  }
  if (mine === token) replaceRuntimeInstruments(INSTRUMENT_PREFIX, next);
}
