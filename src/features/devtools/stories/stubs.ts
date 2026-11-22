import type { PropDoc } from "@/features/exercises/docs";
import type { Props, Story } from "./stories";

/*
 * Stubs for the tools the seed blocks asked for and the app doesn't have yet (tasks.txt, TaskSeries MissingTools). A stub
 * is only a story: it is not in TOOLS, so the AI plan prompt never offers it and no seed file can use it. Each one shows
 * what the tool is for, which blocks wait on it, what is still open, and the props it might take, so the shape can be
 * argued over here before it is built. Building one means a real tool in TOOLS and deleting its stub.
 *
 * Only the new tools are here. A missing prop or bug on a tool that exists (MissingTools4-7, 9-13) is that tool's work.
 */

export interface StubSpec {
  id: string;
  title: string;
  /** the MissingTools task it comes from */
  task: string;
  what: string;
  /** the seed steps that wait on it, as tasks.txt names them */
  waits: string;
  open?: string;
  keywords: string[];
  props: PropDoc[];
  stories: Story[];
}

const hand = (name: string, props: Props): Story => ({ name, props, from: "hand" });
const p = (name: string, type: string, description: string, required = false): PropDoc => ({ name, type, required, description });

export const STUBS: StubSpec[] = [
  {
    id: "vowel-guide",
    title: "vowel-guide",
    task: "MissingTools14",
    what: "An animated mouth shows each vowel (ah, eh, ee, oh, oo) and how it narrows or opens as the note climbs, and the player sings along with it.",
    waits: "voice-intermediate-slides-across-the-break, voice-advanced-guide-tones",
    open: "What the tool expects back: a pitch held on each vowel, read by the mic like the other voice tools, or only a guide to copy with no check?",
    keywords: ["vowel", "vowels", "mouth", "modification", "sing", "voice", "vocal", "break", "mic"],
    props: [
      p("vowels", `("ah" | "eh" | "ee" | "oh" | "oo")[]`, "The vowels, in order."),
      p("from", "string", "The low note, as the voice tools name it (\"C3\")."),
      p("to", "string", "The high note."),
      p("voice", `"bass" | "baritone" | "tenor" | "alto" | "mezzo" | "soprano"`, "Picks the range when from and to are left out."),
      p("check", `"mic" | "none"`, "Whether the mic reads the held pitch (open, see above)."),
    ],
    stories: [
      hand("All five, tenor", { vowels: ["ah", "eh", "ee", "oh", "oo"], voice: "tenor" }),
      hand("ah to oo up through the break", { vowels: ["ah", "oo"], from: "A3", to: "E4", check: "mic" }),
    ],
  },
  {
    id: "staff-reading",
    title: "staff-reading",
    task: "MissingTools15",
    what: "A note shows on the staff and the player names it with answer buttons, like note-finder on the neck. Levels: lines, then spaces, then ledger lines; treble first, bass later.",
    waits: "sight-singing:1, note-names:3 (and MissingTools12: staff can't label its notes)",
    open: "Whether a guitar player's version also plays the note on the neck, and whether it listens for the note sung or played (mic) as well as tapped.",
    keywords: ["staff", "reading", "notation", "note names", "treble", "bass", "clef", "ledger", "quiz", "sight reading"],
    props: [
      p("clef", `"treble" | "bass"`, "Which staff (treble by default)."),
      p("level", `"lines" | "spaces" | "ledger" | "all"`, "Which notes it asks.", true),
      p("answer", `"buttons" | "mic" | "neck"`, "How the player answers (open, see above)."),
      p("count", "number", "Notes in a round."),
    ],
    stories: [
      hand("Treble lines", { clef: "treble", level: "lines" }),
      hand("Treble spaces", { clef: "treble", level: "spaces" }),
      hand("Bass, ledger lines", { clef: "bass", level: "ledger" }),
    ],
  },
];
