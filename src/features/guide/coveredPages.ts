import type { TourStep } from "./tour";
import { ARPEGGIOS_TOUR } from "./tours/arpeggios";
import { BACKING_TOUR } from "./tours/backing";
import { BASICS_TOUR } from "./tours/basics";
import { CAGED_TOUR } from "./tours/caged";
import { CHORDS_TOUR } from "./tours/chords";
import { CIRCLE_TOUR } from "./tours/circle";
import { COURSE_TOUR } from "./tours/course";
import { EARS_TOUR } from "./tours/ears";
import { FAQ_TOUR } from "./tours/faq";
import { IMPROV_TOUR } from "./tours/improv";
import { LOOPER_TOUR } from "./tours/looper";
import { METRONOME_DRONE_TOUR } from "./tours/metronome-drone";
import { NOTES_TOUR } from "./tours/notes";
import { PIANO_TOUR } from "./tours/piano";
import { PLAN_TOUR } from "./tours/plan";
import { RHYTHM_TOUR } from "./tours/rhythm";
import { SCALES_TOUR } from "./tours/scales";
import { SINGING_TOUR } from "./tours/singing";
import { TRIADS_TOUR } from "./tours/triads";
import { TUNE_BY_EAR_TOUR } from "./tours/tune-by-ear";
import { TUNINGS_TOUR } from "./tours/tunings";
import { TUNER_TOUR } from "./tours/tuner";

/** Every page with a guide (a `pageId`): its route and its tour. For /dev/onboarding only, so real pages don't carry the tours. */
export const COVERED_PAGES: { id: string; route: string; tour: TourStep[] }[] = [
  { id: "arpeggios", route: "/theory/arpeggios", tour: ARPEGGIOS_TOUR },
  { id: "backing", route: "/theory/backing", tour: BACKING_TOUR },
  { id: "basics", route: "/theory/basics", tour: BASICS_TOUR },
  { id: "caged", route: "/theory/caged", tour: CAGED_TOUR },
  { id: "chords", route: "/theory/chords", tour: CHORDS_TOUR },
  { id: "circle", route: "/theory/circle", tour: CIRCLE_TOUR },
  { id: "course", route: "/course", tour: COURSE_TOUR },
  { id: "ears", route: "/theory/ears", tour: EARS_TOUR },
  { id: "faq", route: "/faq", tour: FAQ_TOUR },
  { id: "improv", route: "/theory/improv", tour: IMPROV_TOUR },
  { id: "looper", route: "/looper", tour: LOOPER_TOUR },
  { id: "metronome-drone", route: "/theory/metronome-drone", tour: METRONOME_DRONE_TOUR },
  { id: "notes", route: "/theory/notes", tour: NOTES_TOUR },
  { id: "piano", route: "/theory/piano", tour: PIANO_TOUR },
  { id: "plan", route: "/plan", tour: PLAN_TOUR },
  { id: "rhythm", route: "/theory/rhythm", tour: RHYTHM_TOUR },
  { id: "scales", route: "/theory/scales", tour: SCALES_TOUR },
  { id: "singing", route: "/theory/singing", tour: SINGING_TOUR },
  { id: "triads", route: "/theory/triads", tour: TRIADS_TOUR },
  { id: "tune-by-ear", route: "/theory/tune-by-ear", tour: TUNE_BY_EAR_TOUR },
  { id: "tuner", route: "/tuner", tour: TUNER_TOUR },
  { id: "tunings", route: "/theory/tunings", tour: TUNINGS_TOUR },
];
