import type { ToolName } from "../plan/model/tools";
import { seenKey, type TourStep } from "./tour";

/**
 * The short tour of each exercise tool, walked from the tour button in the tool's frame on /plan and scoped to that
 * frame. Each step's `target` is a `data-tour` attribute inside the tool; a step whose target is hidden at the current
 * level, or not drawn for this exercise, is skipped. Seen state is kept per tool type (`toolTourSeenKey`).
 */

/** The singing player (`SingAlong`) the melody, run and string singers share. */
const singAlong = (what: string, notes: string): TourStep[] => [
  { target: "sing-play", title: "Play and stop", text: `Play runs ${what} from the start. A bar moves along the notes as they play.` },
  { target: "sing-mic", title: "Sing with the mic", text: "Switch the mic on and sing along. A dot shows the note you sing, so you can see when you are on it." },
  { target: "sing-tune", title: "The notes", text: notes },
  { target: "sing-loop", title: "Loop a part", text: "Loop a hard part: drag the markers on the strip to pick it.", minLevel: "standard" },
];

/** The tab player the finger, picking and legato drills share. */
const drill = (watch: string): TourStep[] => [
  { target: "drill-play", title: "Play it", text: "Play sounds the drill round and round, and lights the note playing. Play along with it." },
  { target: "drill-tab", title: "The tab", text: `Each line is a string, high e on top, and the number is the fret. ${watch}` },
];

/** The practice band the click-drone and backing-band tools show. */
const band = (what: string): TourStep[] => [
  { target: "band-play", title: "Play", text: `Play starts ${what}. Press it again to stop.` },
  { target: "band-parts", title: "What plays", text: "Tap a part to switch it on or off, even while it plays." },
  { target: "band-tempo", title: "Tempo", text: "Make it slower or faster with − and +." },
  { target: "band-more", title: "More", text: "More settings: the exact tempo, and each part's own sound.", minLevel: "standard" },
];

export const TOOL_TOURS: Record<ToolName, TourStep[]> = {
  "scale-neck": [
    { target: "scale-neck-boxes", title: "The positions", text: "Each picture is one position of the scale on the neck. Tap a dot to hear its note." },
    { target: "scale-neck-play", title: "Hear it", text: "Play runs the position up and back down. Play along with it." },
  ],
  "position-neck": [
    { target: "position-neck-neck", title: "The neck", text: "The framed notes are the position to play. Tap a dot to hear its note." },
    { target: "position-neck-play", title: "Hear it", text: "Play runs what is framed up and back down." },
    { target: "position-neck-picker", title: "Pick a position", text: "Tap a position here to frame it on the neck. You can frame more than one." },
    { target: "position-neck-cross", title: "Cross over", text: "The ⇄ buttons show the way from one position to the next. Pick the string to cross on.", minLevel: "standard" },
  ],
  "arpeggio-neck": [
    { target: "arpeggio-neck-box", title: "The arpeggio", text: "The chord's notes, one at a time, in one place on the neck. Tap a dot to hear it." },
    { target: "arpeggio-neck-play", title: "Hear it", text: "Play runs the notes up and back down. Play along with it." },
  ],
  "chord-shapes": [
    { target: "chord-shapes-chords", title: "The chords", text: "One chord box per chord, in the order you play them." },
    { target: "chord-shapes-box", title: "Hear a chord", text: "Tap a chord box to hear it strummed, then play it yourself." },
  ],
  staff: [
    { target: "staff-mic", title: "Sing with the mic", text: "Switch the mic on and sing. A dot shows the note you sing on the staff." },
    { target: "staff-backing", title: "Backing", text: "Play starts the sound this exercise sings over. Press it again to stop." },
    { target: "staff-notes", title: "The notes", text: "Tap a note to hear it, then sing it back." },
    { target: "staff-settings", title: "Settings", text: "How the notes are named and how close counts as on the note.", minLevel: "standard" },
  ],
  "click-drone": band("the metronome and the drone, or the one this exercise uses"),
  "backing-band": band("the band"),
  "note-finder": [
    { target: "note-finder-start", title: "Start", text: "Press Start and read what to find. Skip moves on to the next one." },
    { target: "note-finder-neck", title: "Answer", text: "Tap the note on the neck, or pick its name when the game lights a note for you to name." },
    { target: "note-finder-answer-by", title: "Tap or play", text: "Switch to the mic to answer by playing the note on your guitar instead." },
    { target: "note-finder-extras", title: "Sprint", text: "Try a 60-second sprint, or show where you miss most.", minLevel: "standard" },
  ],
  "interval-ears": [
    { target: "interval-ears-play", title: "Listen", text: "Press Start and listen. Replay plays it again." },
    { target: "interval-ears-answers", title: "Answer", text: "Pick what you heard. A wrong answer shows the right one." },
  ],
  "tuning-ears": [
    { target: "tuning-ears-start", title: "Listen", text: "Start plays two notes. The repeat button plays them again." },
    { target: "tuning-ears-answers", title: "Answer", text: "Is the open string flat, in tune or sharp? Pick one to see." },
  ],
  "melody-singer": singAlong("the tune", "Tap a note to hear it. The chords play under the tune unless the exercise turns them off."),
  "run-singer": singAlong("the run", "Tap a note to hear it. The run moves through several keys, and the title shows which one is playing."),
  "string-singer": singAlong("the open strings", "Tap a note to hear it. Sing each one and hold it."),
  "interval-singer": [
    { target: "interval-singer-start", title: "Start", text: "Start plays Do. Then sing the interval named above from it." },
    { target: "interval-singer-mic", title: "The mic", text: "Keep the mic on and hold the note until it says Yes." },
    { target: "interval-singer-view", title: "Do and your note", text: "Do is drawn here, and your note shows once you find it. Tap a note to hear it." },
    { target: "interval-singer-options", title: "Options", text: "Switch the view, pick the keys Do comes from, or hide your voice to make it harder.", minLevel: "standard" },
  ],
  "guitar-play-along": [
    { target: "play-along-play", title: "Play", text: "Play starts the backing and the part to play along with. It loops until you stop it." },
    { target: "play-along-music", title: "What to play", text: "The note to play now is lit as the music moves." },
    { target: "play-along-tempo", title: "Tempo", text: "Make it slower with − until you can play along, then speed it up." },
    { target: "play-along-view", title: "View", text: "Show the part as tab, as notes or on the neck.", minLevel: "standard" },
  ],
  "chord-backing": [
    { target: "chord-backing-play", title: "Play", text: "Play starts the chords, one a bar, looping." },
    { target: "chord-backing-chords", title: "The chords", text: "The chord playing now is lit, and the next one is outlined." },
    { target: "chord-backing-tempo", title: "Tempo", text: "Make it slower or faster with − and +." },
  ],
  "strum-along": [
    { target: "strum-along-play", title: "Play", text: "Play starts the metronome with a short count-in. Strum along with it." },
    { target: "strum-along-bars", title: "The strums", text: "Arrows show the strums: down or up. The one to play now is lit." },
    { target: "strum-along-tempo", title: "Tempo", text: "Make it slower with − until the changes feel easy." },
  ],
  "finger-pattern": drill("Under it, the finger to use for each note."),
  "picking-drill": drill("Under it, the pick stroke for each note: ↓ down, ↑ up."),
  "legato-trill": drill("Pick only the first note. Hammer on and pull off the rest."),
};

/** The page id a tool type's tour seen flag is stored under (`useTourSeen`). */
export function toolTourId(type: string): string {
  return `tool.${type}`;
}

/** `musickit.tour.tool.<type>`: set once the tool's tour button has been clicked. */
export function toolTourSeenKey(type: string): string {
  return seenKey(toolTourId(type));
}
