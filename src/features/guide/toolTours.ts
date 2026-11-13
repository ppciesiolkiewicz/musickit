import type { ToolName } from "../plan/model/tools";
import { seenKey, type TourStep } from "./tour";

/**
 * The short tour of each exercise tool, walked from the tour button in the tool's frame on /plan and scoped to that
 * frame. Each step's `target` is a `data-tour` attribute inside the tool; a step whose target is hidden at the current
 * level, or not drawn for this exercise, is skipped. Seen state is kept per tool type (`toolTourSeenKey`).
 */

/** The singing player (`SingAlong`) the melody, run and string singers share. */
const singAlong = (what: string, notes: string): TourStep[] => [
  { target: "sing-play", title: "Play and stop", text: `Play runs ${what} from the start. A bar moves along the notes as they play, and Play turns into Stop.` },
  { target: "sing-mic", title: "Sing with the mic", text: "Switch the mic on and sing along. A dot shows the note you sing, so you can see when you are on it." },
  { target: "sing-tune", title: "The notes", text: notes },
  { target: "sing-loop", title: "Loop a part", text: "Loop a hard part: drag the markers on the strip to pick it.", minLevel: "standard" },
];

/** The tab player the finger, picking and legato drills share. */
const drill = (watch: string): TourStep[] => [
  { target: "drill-play", title: "Play it", text: "Play starts the metronome and sounds the drill with it, one note per beat, lighting the note playing. Play along with it." },
  { target: "drill-tab", title: "The tab", text: `Each line is a string, high e on top, and the number is the fret. ${watch}` },
];

/** The practice band the backing-band tool shows. */
const band = (what: string): TourStep[] => [
  { target: "band-play", title: "Play", text: `Play starts ${what}. Press it again to stop.` },
  { target: "band-parts", title: "What plays", text: "Tap a part to switch it on or off, even while it plays. A part this exercise always plays stays on." },
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
  "melody-singer": singAlong("the tune", "Tap a note to hear it. The chords play under the tune unless the exercise turns them off."),
  "run-singer": singAlong("the run", "Tap a note to hear it. The run moves through several keys, and the title shows which one is playing."),
  "string-singer": singAlong("the open strings", "Tap a note to hear it. Sing each one and hold it."),
  breathwork: [
    { target: "breath-play", title: "Start", text: "Play starts the breathing. A soft tick marks each count and a chime each change, so you can close your eyes." },
    { target: "breath-circle", title: "Follow the circle", text: "Breathe in as it grows, hold while it stays, breathe out as it shrinks. The number counts down the phase." },
    { target: "breath-strip", title: "What comes", text: "Every phase of the exercise, in order. The bell at the top switches the sound off." },
  ],
  "voice-hill": [
    { target: "hill-play", title: "Start", text: "Play sounds the note, then the mic starts. Press it again to stop." },
    { target: "hill-view", title: "The hill", text: "The ball shows your voice. Hold it on the green part of the ground until the ring round the ball fills." },
    { target: "hill-note", title: "Play note", text: "Plays the note at the edge of the green part, to find it again." },
    { target: "hill-mic", title: "The mic", text: "Listens to your voice. It opens the list of inputs, with each input's level." },
  ],
  "lip-roll": [
    { target: "lip-roll-play", title: "Start", text: "Play starts the rounds: listen to the tone, then lip roll it on your own." },
    { target: "lip-roll-view", title: "Your line", text: "The blue band is the tone's path. On your turn the mic draws your line over it, green where it is close." },
    { target: "lip-roll-mic", title: "The mic", text: "Listens on your turn only. Press it to switch it off or pick another input." },
  ],
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
  "backing-track": [
    { target: "backing-play", title: "Play and tempo", text: "Press Play to start the band. Change the tempo while it plays." },
    { target: "backing-chords", title: "The chords", text: "The chord playing now lights up." },
    { target: "backing-choose", title: "What the band plays", text: "Pick another progression, key or style. A change comes in on the next bar.", minLevel: "standard" },
    { target: "backing-band", title: "The band", text: "Turn a part down, or mute it to play that part yourself. A part this exercise always plays has no mute." },
  ],
  "strum-along": [
    { target: "strum-along-play", title: "Play", text: "Play starts the metronome with a short count-in. Strum along with it." },
    { target: "strum-along-bars", title: "The strums", text: "Arrows show the strums: down or up. The one to play now is lit." },
    { target: "strum-along-tempo", title: "Tempo", text: "Make it slower with − until the changes feel easy." },
  ],
  "finger-pattern": drill("Under it, the finger to use for each note."),
  "picking-drill": drill("Under it, the pick stroke for each note: ↓ down, ↑ up."),
  "legato-trill": drill("Pick only the first note. Hammer on and pull off the rest."),
  video: [
    { target: "video-player", title: "The video", text: "Press the play button on the video to start it, then play or sing along. Drag along the bar under the picture to go back to a part." },
  ],
};

/** The page id a tool type's tour seen flag is stored under (`useTourSeen`). */
export function toolTourId(type: string): string {
  return `tool.${type}`;
}

/** `musickit.tour.tool.<type>`: set once the tool's tour button has been clicked. */
export function toolTourSeenKey(type: string): string {
  return seenKey(toolTourId(type));
}
