import type { TourStep } from "../tour";

/** The backing tracks page tour. */
export const BACKING_TOUR: TourStep[] = [
  {
    target: "backing-play",
    title: "Play and tempo",
    text: "Press play, or Space, to start the band. Change the tempo while it plays.",
  },
  {
    target: "backing-choose",
    title: "What the band plays",
    text: "Pick a progression, a key and a style. A change comes in on the next bar.",
  },
  {
    target: "backing-chords",
    title: "The chords",
    text: "The chord playing now lights up. Under the chords, the key and the notes of its scale.",
  },
  {
    target: "backing-band",
    title: "The band",
    text: "Turn the drums, bass or keys down, or mute one to play that part yourself.",
  },
];
