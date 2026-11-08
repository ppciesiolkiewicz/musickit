import type { TourStep } from "../tour";

/** The metronome and drone page tour. */
export const METRONOME_DRONE_TOUR: TourStep[] = [
  {
    target: "jam-all",
    title: "Play all",
    text: "Starts every part together, on the next beat. Space does the same. The key comes from the drone.",
  },
  {
    target: "jam-metronome",
    title: "Metronome",
    text: "Set the tempo here. Press play to hear the click on its own.",
  },
  {
    target: "jam-drone",
    title: "Drone",
    text: "One note that keeps sounding. Pick its note, then play a scale over it and listen to how each note feels against it.",
  },
  {
    target: "jam-band",
    title: "Drums",
    text: "Pick a pattern and press play. It starts on the next beat, so it stays with the rest. The bass under it works the same way, in the drone's key.",
  },
  {
    target: "jam-loops",
    title: "Loops",
    text: "Record a few bars of your own playing and it plays round with the rest.",
  },
];
