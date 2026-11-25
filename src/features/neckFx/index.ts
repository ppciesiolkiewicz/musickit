/**
 * Neck effects: reads the neck from printed markers and the hands (NeckView), works out where the frets are, and draws test
 * effects over a video, live or a take. Used by the riff Take panel and the content video record page. See README.md.
 */
export { default as NeckView } from "./ui/NeckView";
export { default as NeckCvView } from "./ui/NeckCvView";
export { default as FxControls, useFx } from "./ui/FxControls";
export { fretAt, gridOf, parsePlaced, placeByHand, type Grid, type NeckRead, type Placed, type Pt } from "./model/grid";
export type { FxSettings } from "./model/fx";
