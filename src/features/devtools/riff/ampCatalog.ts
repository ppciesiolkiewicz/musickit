/**
 * Sorts the amp models in the riff maker's picker by the gear they capture, so an amp is found by its name and not by the
 * name of whoever captured it. Only what the picker shows changes: a model keeps its file name, which a riff saves as its amp.
 */

export type GearKind = "amp" | "pedal" | "other";

export interface Gear {
  kind: GearKind;
  /** the gear captured, e.g. "Marshall JCM2000": the group the model is listed under */
  gear: string;
  /** what sets this capture apart from the others of the same gear (settings, channel), or "Standard" */
  variant: string;
}

/** Tested in order, on the name without its capturer: amps first, since an amp capture may name the pedal in front of it. */
const RULES: [RegExp, GearKind, string][] = [
  [/Ceriatone King Kong/i, "amp", "Ceriatone King Kong"],
  [/V4 Countess/i, "amp", "V4 Countess"],
  [/KSR CERES/i, "amp", "KSR Ceres"],
  [/KSR VESTA/i, "amp", "KSR Vesta"],
  [/Sovtek ?MIG ?50/i, "amp", "Sovtek MIG-50"],
  [/Bug(?:era)?1990/i, "amp", "Bugera 1990"],
  [/Bug(?:era)?[- ]?333/i, "amp", "Bugera 333"],
  [/Bug(?:era)?6262/i, "amp", "Bugera 6262"],
  [/JVM/, "amp", "Marshall JVM"],
  [/(?:Marshall )?JCM ?2000/i, "amp", "Marshall JCM2000"],
  [/(?:Marshall )?JCM ?900/i, "amp", "Marshall JCM900"],
  [/(?:Marshall )?JCM ?800/i, "amp", "Marshall JCM800"],
  [/Laney ?GH100S/i, "amp", "Laney GH100S"],
  [/VOX ?AC15/i, "amp", "Vox AC15"],
  [/Dirty ?Shirley ?Mini|Friedman ?DSM/i, "amp", "Friedman Dirty Shirley Mini"],
  [/^5152\b/, "amp", "Peavey 5150 II"],
  [/5150 Stealth/i, "amp", "5150 Stealth"],
  [/Fender ?Twin ?(?:Verb|Reverb)/i, "amp", "Fender Twin Reverb"],
  [/FNDR BFSR/i, "amp", "Fender Super Reverb"],
  [/Jet City/i, "amp", "Jet City"],
  [/Magnatone Super[- ]?59(?: MKii)?/i, "amp", "Magnatone Super 59 Mk II"],
  [/Splawn Pro Mod/i, "amp", "Splawn Pro Mod"],
  [/\[Suhr RL\]/i, "amp", "Suhr RL"],
  [/\[Mesa 2x12\]/i, "amp", "Suhr RL (Mesa 2x12 cab)"],
  [/Driftwood Nightmare/i, "amp", "Driftwood Nightmare"],
  [/(?:90s ?)?Dual ?Rec(?:tifier)?(?: RI)?/i, "amp", "Mesa Dual Rectifier"],
  [/YERASOV/i, "amp", "Yerasov"],
  [/Engl Savage/i, "amp", "Engl Savage"],
  [/EVH 5150 ii/i, "amp", "EVH 5150 II"],
  [/Peavey 5150/i, "amp", "Peavey 5150"],
  [/Mesa Mark IV/i, "amp", "Mesa Mark IV"],
  [/Peavey|EVH|Mesa|Marshall|Fender|Engl|Bugera|Vox/i, "amp", ""],
  [/Soldano .*pedal/i, "pedal", "Soldano SLO pedal"],
  [/Tech21 dUg/i, "pedal", "Tech 21 dUg DP3X (bass)"],
  [/Boss OS-2/i, "pedal", "Boss OS-2"],
  [/(?:Boss[- ]?)?HM-?2/i, "pedal", "Boss HM-2"],
  [/DS-?1/, "pedal", "Boss DS-1"],
  [/(?:Boss[- ]?)?SD-?1/i, "pedal", "Boss SD-1"],
  [/Klone?(?: clone)?/i, "pedal", "Klon clone"],
  [/Plumes ?Clone/i, "pedal", "Plumes clone"],
  [/Dirty ?Tree/i, "pedal", "Dirty Tree"],
  [/(?:Maxon[- ]?)?OD808/i, "pedal", "Maxon OD808"],
  [/MXR[- ]?M77/i, "pedal", "MXR M77"],
  [/Precision[- ]Drive/i, "pedal", "Precision Drive"],
  [/Seymour Duncan 805/i, "pedal", "Seymour Duncan 805"],
  [/(?:Ibanez )?Tube Screamer Mini/i, "pedal", "Ibanez Tube Screamer Mini"],
  [/^TS9\b/i, "pedal", "Ibanez TS9"],
  [/Demonfx Dual Boost/i, "pedal", "Demonfx Dual Boost"],
  [/Fortin Grind/i, "pedal", "Fortin Grind"],
];

/** "Tim R Jet City G4" → "Jet City G4": the community files start with the capturer's first name and initial. */
const withoutCapturer = (name: string) => name.replace(/^[A-Z][a-z]+ [A-Z] /, "");

/** The amp library's files have slug names ("pedal-boss-hm2-swede"): words again, without the "pedal" in front. */
const unslugged = (name: string) => (/^[a-z0-9-]+$/.test(name) ? name.replace(/-/g, " ").replace(/^pedal /, "") : name);

/** Spaces for underscores and dashes between words, no training-error tags ("ESR_0.0013", "ESR0,007"), no doubled spaces. */
const tidy = (s: string) =>
  s
    .replace(/[ _-]*ESR[ _-]*[\d.,]+/gi, "")
    .replace(/[ _-]*normalized-6dB/gi, "")
    .replace(/_/g, " ")
    .replace(/(?<=\w)-(?=[A-Za-z])/g, " ")
    .replace(/(?:\s*-\s*){2,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-+/]+|[\s\-+/]+$/g, "");

/** "engl-savage" → "Engl Savage", for the slug names of the amp library's files. */
const titled = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** The gear a model captures, guessed from its name. A name no rule knows is "other", listed under its own tidy name. */
export function gearOf(name: string): Gear {
  const bare = unslugged(withoutCapturer(name.trim()));
  for (const [re, kind, gear] of RULES) {
    const m = bare.match(re);
    if (!m) continue;
    if (!gear) {
      // a brand alone: the whole name is the gear, there is no variant to split off
      const g = tidy(bare);
      return { kind, gear: /[A-Z]/.test(g) ? g : titled(g), variant: "Standard" };
    }
    const variant = tidy(bare.slice(0, m.index) + " " + bare.slice((m.index ?? 0) + m[0].length));
    return { kind, gear, variant: variant ? variant[0].toUpperCase() + variant.slice(1) : "Standard" };
  }
  const g = tidy(bare);
  return { kind: "other", gear: /[A-Z]/.test(g) ? g : titled(g), variant: "Standard" };
}

export type KindFilter = GearKind | "all";

/** Whether a model's name or its gear holds every word of the search, any case. An empty search matches all. */
export function matchesSearch(name: string, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const g = gearOf(name);
  const hay = `${name} ${g.gear} ${g.variant}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

const ORDER: Record<GearKind, number> = { amp: 0, pedal: 1, other: 2 };

/**
 * The picker's groups: models by gear, amps first, then pedals, then the rest, each part A to Z, and a gear's captures A to Z
 * by variant (numbers in order: G4 before G10). Only models of the kind asked for that match the search.
 */
export function groupByGear<T extends { name: string }>(models: T[], kind: KindFilter, search: string): { kind: GearKind; gear: string; items: (T & { variant: string })[] }[] {
  const groups = new Map<string, { kind: GearKind; gear: string; items: (T & { variant: string })[] }>();
  for (const m of models) {
    const g = gearOf(m.name);
    if (kind !== "all" && g.kind !== kind) continue;
    if (!matchesSearch(m.name, search)) continue;
    const key = `${g.kind}\u0000${g.gear}`;
    if (!groups.has(key)) groups.set(key, { kind: g.kind, gear: g.gear, items: [] });
    groups.get(key)!.items.push({ ...m, variant: g.variant });
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const out = [...groups.values()].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || cmp(a.gear, b.gear));
  for (const g of out) g.items.sort((a, b) => cmp(a.variant, b.variant) || cmp(a.name, b.name));
  return out;
}
