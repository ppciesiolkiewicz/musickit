import type { TourStep } from "../tour";

/** The looper page tour. The view step targets a Standard-only control, so Simple skips it. */
export const LOOPER_TOUR: TourStep[] = [
  {
    target: "looper-stage",
    title: "Your loops",
    text: "Click an empty circle to record a loop, and click it again to end the first take. The loop then keeps playing in time.",
  },
  {
    target: "looper-metronome",
    title: "The beat",
    text: "Press play to start the metronome any time. Set the tempo here, and use the bell to silence the click.",
  },
  {
    target: "looper-add",
    title: "Add more",
    text: "The round + button adds loops, groups and inputs, a drum sequencer or a drone that holds one note.",
  },
  {
    target: "looper-settings",
    title: "Settings",
    text: "Your inputs and output, the timing and a MIDI keyboard are set up here.",
  },
  {
    target: "looper-view",
    title: "Two views",
    text: "Canvas lets you drag the blocks around and shows the connections as wires. Fixed layout keeps everything in its place.",
  },
];
