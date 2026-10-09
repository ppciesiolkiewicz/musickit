/** What the plugins show when no key is chosen: the general facts, not tied to any tonic. Pure data. */
export interface ChordType {
  name: string;
  /** suffix as the theory feature writes it (see voicing.ts) */
  symbol: string;
  formula: string;
  feel: string;
}

export const CHORD_TYPES: ChordType[] = [
  { name: "Major", symbol: "", formula: "1 3 5", feel: "bright, settled" },
  { name: "Minor", symbol: "m", formula: "1 ♭3 5", feel: "darker, inward" },
  { name: "Diminished", symbol: "dim", formula: "1 ♭3 ♭5", feel: "tense, wants to resolve" },
  { name: "Augmented", symbol: "aug", formula: "1 3 ♯5", feel: "unsettled, floating" },
  { name: "Suspended 2", symbol: "sus2", formula: "1 2 5", feel: "open, no third" },
  { name: "Suspended 4", symbol: "sus4", formula: "1 4 5", feel: "open, leans to the major" },
  { name: "Major 7", symbol: "maj7", formula: "1 3 5 7", feel: "smooth, dreamy" },
  { name: "Dominant 7", symbol: "7", formula: "1 3 5 ♭7", feel: "bluesy, wants to move" },
  { name: "Minor 7", symbol: "m7", formula: "1 ♭3 5 ♭7", feel: "mellow, jazzy" },
  { name: "Half-diminished", symbol: "m7♭5", formula: "1 ♭3 ♭5 ♭7", feel: "the ii of a minor ii–V–i" },
  { name: "Diminished 7", symbol: "dim7", formula: "1 ♭3 ♭5 ♭♭7", feel: "symmetrical, dramatic" },
];

/** The root the general pages play from. */
export const C_PC = 0;
