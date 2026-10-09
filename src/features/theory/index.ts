/**
 * The theory module: music theory with no guitar, no sound and no page in it. Shared by the guitar pages, the improvisation games and the creator.
 *
 *   theory       families and modes (21), tonics and their spelling, key contexts (notes, chords of a key), degree labels
 *   scales       mode pages, chord stacks, relatives, step patterns, the degree colours
 *   modeGroups   comparing modes that share a tonic
 *   progressions the written progressions and what they become in a key
 *   labels       how a note is shown: name, interval, degree or chord (the app-wide choice)
 *   useLabelSystem  the React store and dropdown for that choice
 */
export * from "./theory";
export * from "./scales";
export * from "./modeGroups";
export * from "./progressions";
export * from "./labels";
