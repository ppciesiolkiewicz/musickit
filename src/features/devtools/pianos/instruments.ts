/**
 * TEMPORARY (delete with /dev/pianos). The instruments the dev page compares, and the sample sets each one can play from: the
 * app's own Casio samples (read from the sound engine's config, so they match what the app plays), tonejs-instruments, Salamander
 * and FatBoy files, and the General MIDI name smplr's soundfonts know it by. Pure.
 */

import { INSTRUMENTS } from "@/features/sound/engine/instruments";
import { noteToMidi } from "@/features/sound/engine/notes";

/** Samples on files: which note each file is, by MIDI number. */
export interface SampleSet {
  id: string;
  label: string;
  about: string;
  files: Record<number, string>;
}

export interface Instrument {
  id: string;
  label: string;
  sets: SampleSet[];
  /** its name in the General MIDI soundfonts smplr plays (MusyngKite) */
  soundfont?: string;
  /** smplr's own grand piano can play it */
  splendid?: boolean;
}

const SHARP_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const octave = (midi: number) => Math.floor(midi / 12) - 1;
/** "Ds4" for 63: the file names Tone.js libraries use */
export const sharpFile = (midi: number) => `${SHARP_NAMES[midi % 12]}${octave(midi)}`;
/** "Eb4" for 63: the file names of the gleitz soundfonts */
export const flatFile = (midi: number) => `${FLAT_NAMES[midi % 12]}${octave(midi)}`;
const span = (lo: number, hi: number, keep: (m: number) => boolean = () => true) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(keep);

/** The app's sampled instrument of that id, as the sound engine plays it. */
function casio(id: keyof typeof INSTRUMENTS): SampleSet {
  const c = INSTRUMENTS[id];
  const files = Object.fromEntries(Object.entries(c.urls as Record<string, string>).map(([note, file]) => [noteToMidi(note)!, c.baseUrl + file]));
  return { id: "casio", label: `Casio SA-10 (in the app: ${c.label})`, about: "The app's own samples today, from a Casio SA-10 soundfont.", files };
}

/** tonejs-instruments' note lists ("A#1=As1 …": the note, then the file it plays), copied from its Tonejs-Instruments.js */
const TJI: Record<string, string> = {
  "piano": "A7=A7 A1=A1 A2=A2 A3=A3 A4=A4 A5=A5 A6=A6 A#7=As7 A#1=As1 A#2=As2 A#3=As3 A#4=As4 A#5=As5 A#6=As6 B7=B7 B1=B1 B2=B2 B3=B3 B4=B4 B5=B5 B6=B6 C7=C7 C1=C1 C2=C2 C3=C3 C4=C4 C5=C5 C6=C6 C7=C7 C#7=Cs7 C#1=Cs1 C#2=Cs2 C#3=Cs3 C#4=Cs4 C#5=Cs5 C#6=Cs6 D7=D7 D1=D1 D2=D2 D3=D3 D4=D4 D5=D5 D6=D6 D#7=Ds7 D#1=Ds1 D#2=Ds2 D#3=Ds3 D#4=Ds4 D#5=Ds5 D#6=Ds6 E7=E7 E1=E1 E2=E2 E3=E3 E4=E4 E5=E5 E6=E6 F7=F7 F1=F1 F2=F2 F3=F3 F4=F4 F5=F5 F6=F6 F#7=Fs7 F#1=Fs1 F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 F#6=Fs6 G7=G7 G1=G1 G2=G2 G3=G3 G4=G4 G5=G5 G6=G6 G#7=Gs7 G#1=Gs1 G#2=Gs2 G#3=Gs3 G#4=Gs4 G#5=Gs5 G#6=Gs6",
  "harmonium": "C2=C2 C3=C3 C4=C4 C5=C5 C#2=Cs2 C#3=Cs3 C#4=Cs4 C#5=Cs5 D2=D2 D3=D3 D4=D4 D5=D5 D#2=Ds2 D#3=Ds3 D#4=Ds4 E2=E2 E3=E3 E4=E4 F2=F2 F3=F3 F4=F4 F#2=Fs2 F#3=Fs3 G2=G2 G3=G3 G4=G4 G#2=Gs2 G#3=Gs3 G#4=Gs4 A2=A2 A3=A3 A4=A4 A#2=As2 A#3=As3 A#4=As4",
  "bassoon": "A4=A4 C3=C3 C4=C4 C5=C5 E4=E4 G2=G2 G3=G3 G4=G4 A2=A2 A3=A3",
  "cello": "E3=E3 E4=E4 F2=F2 F3=F3 F4=F4 F#3=Fs3 F#4=Fs4 G2=G2 G3=G3 G4=G4 G#2=Gs2 G#3=Gs3 G#4=Gs4 A2=A2 A3=A3 A4=A4 A#2=As2 A#3=As3 B2=B2 B3=B3 B4=B4 C2=C2 C3=C3 C4=C4 C5=C5 C#3=Cs3 C#4=Cs4 D2=D2 D3=D3 D4=D4 D#2=Ds2 D#3=Ds3 D#4=Ds4 E2=E2",
  "flute": "A6=A6 C4=C4 C5=C5 C6=C6 C7=C7 E4=E4 E5=E5 E6=E6 A4=A4 A5=A5",
  "guitar-electric": "D#3=Ds3 D#4=Ds4 D#5=Ds5 E2=E2 F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 A2=A2 A3=A3 A4=A4 A5=A5 C3=C3 C4=C4 C5=C5 C6=C6 C#2=Cs2",
  "guitar-acoustic": "F4=F4 F#2=Fs2 F#3=Fs3 F#4=Fs4 G2=G2 G3=G3 G4=G4 G#2=Gs2 G#3=Gs3 G#4=Gs4 A2=A2 A3=A3 A4=A4 A#2=As2 A#3=As3 A#4=As4 B2=B2 B3=B3 B4=B4 C3=C3 C4=C4 C5=C5 C#3=Cs3 C#4=Cs4 C#5=Cs5 D2=D2 D3=D3 D4=D4 D5=D5 D#2=Ds2 D#3=Ds3 D#4=Ds3 E2=E2 E3=E3 E4=E4 F2=F2 F3=F3",
  "guitar-nylon": "F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 G3=G3 G5=G3 G#2=Gs2 G#4=Gs4 G#5=Gs5 A2=A2 A3=A3 A4=A4 A5=A5 A#5=As5 B1=B1 B2=B2 B3=B3 B4=B4 C#3=Cs3 C#4=Cs4 C#5=Cs5 D2=D2 D3=D3 D5=D5 D#4=Ds4 E2=E2 E3=E3 E4=E4 E5=E5",
  "violin": "A3=A3 A4=A4 A5=A5 A6=A6 C4=C4 C5=C5 C6=C6 C7=C7 E4=E4 E5=E5 E6=E6 G4=G4 G5=G5 G6=G6",
  "organ": "C3=C3 C4=C4 C5=C5 C6=C6 D#1=Ds1 D#2=Ds2 D#3=Ds3 D#4=Ds4 D#5=Ds5 F#1=Fs1 F#2=Fs2 F#3=Fs3 F#4=Fs4 F#5=Fs5 A1=A1 A2=A2 A3=A3 A4=A4 A5=A5 C1=C1 C2=C2",
  "saxophone": "D#5=Ds5 E3=E3 E4=E4 E5=E5 F3=F3 F4=F4 F5=F5 F#3=Fs3 F#4=Fs4 F#5=Fs5 G3=G3 G4=G4 G5=G5 G#3=Gs3 G#4=Gs4 G#5=Gs5 A4=A4 A5=A5 A#3=As3 A#4=As4 B3=B3 B4=B4 C4=C4 C5=C5 C#3=Cs3 C#4=Cs4 C#5=Cs5 D3=D3 D4=D4 D5=D5 D#3=Ds3 D#4=Ds4",
  "trumpet": "C6=C6 D5=D5 D#4=Ds4 F3=F3 F4=F4 F5=F5 G4=G4 A3=A3 A5=A5 A#4=As4 C4=C4",
  "clarinet": "D4=D4 D5=D5 D6=D6 F3=F3 F4=F4 F5=F5 F#6=Fs6 A#3=As3 A#4=As4 A#5=As5 D3=D3",
};
function tji(name: string): SampleSet {
  const files: Record<number, string> = {};
  for (const pair of TJI[name].split(" ")) {
    const [note, file] = pair.split("=");
    files[noteToMidi(note)!] = `https://nbrosowsky.github.io/tonejs-instruments/samples/${name}/${file}.mp3`;
  }
  return { id: `tji-${name}`, label: `tonejs-instruments · ${name}`, about: "nbrosowsky/tonejs-instruments, CC-BY 3.0, recorded instruments (mp3).", files };
}

const salamander: SampleSet = {
  id: "salamander",
  label: "Salamander Grand",
  about: "Yamaha C5 recorded by Alexander Holm, CC-BY 3.0, as Tone.js serves it: a sample every three semitones.",
  files: Object.fromEntries(span(21, 108, (m) => m % 3 === 0).map((m) => [m, `https://tonejs.github.io/audio/salamander/${sharpFile(m)}.mp3`])),
};
const fatboy: SampleSet = {
  id: "fatboy",
  label: "FatBoy",
  about: "gleitz/midi-js-soundfonts, FatBoy acoustic grand: a sample for every note. Licence not checked.",
  files: Object.fromEntries(span(21, 108).map((m) => [m, `https://gleitz.github.io/midi-js-soundfonts/FatBoy/acoustic_grand_piano-mp3/${flatFile(m)}.mp3`])),
};

export const INSTRUMENTS_TO_COMPARE: Instrument[] = [
  { id: "piano", label: "Piano", sets: [casio("PIANO"), tji("piano"), salamander, fatboy], soundfont: "acoustic_grand_piano", splendid: true },
  { id: "e-piano", label: "Electric piano", sets: [casio("ELEC_PIANO")], soundfont: "electric_piano_1" },
  { id: "honky-tonk", label: "Honky-tonk piano", sets: [casio("HONKY_TONK_PIANO")], soundfont: "honkytonk_piano" },
  { id: "accordion", label: "Accordion / harmonium", sets: [casio("ACCORDION"), tji("harmonium")], soundfont: "accordion" },
  { id: "bassoon", label: "Bassoon", sets: [casio("BASSOON"), tji("bassoon")], soundfont: "bassoon" },
  { id: "cello", label: "Cello", sets: [casio("CELLO"), tji("cello")], soundfont: "cello" },
  { id: "flute", label: "Flute", sets: [casio("FLUTE"), tji("flute")], soundfont: "flute" },
  { id: "electric-guitar", label: "Electric guitar", sets: [casio("METAL_GUITAR"), tji("guitar-electric")], soundfont: "electric_guitar_clean" },
  { id: "synth-brass", label: "Synth brass", sets: [casio("SYNTH_BRASS")], soundfont: "synth_brass_1" },
  { id: "synth-lead", label: "Synth lead", sets: [casio("SYNTH_LEAD")], soundfont: "lead_2_sawtooth" },
  { id: "pop-lead", label: "Pop lead", sets: [casio("POP_LEAD")], soundfont: "lead_1_square" },
  { id: "synth-accordion", label: "Synth accordion", sets: [casio("SYNTH_ACCORDION")] },
  { id: "acoustic-guitar", label: "Acoustic guitar (not in the app)", sets: [tji("guitar-acoustic")], soundfont: "acoustic_guitar_steel" },
  { id: "nylon-guitar", label: "Nylon guitar (not in the app)", sets: [tji("guitar-nylon")], soundfont: "acoustic_guitar_nylon" },
  { id: "violin", label: "Violin (not in the app)", sets: [tji("violin")], soundfont: "violin" },
  { id: "organ", label: "Organ (not in the app)", sets: [tji("organ")], soundfont: "drawbar_organ" },
  { id: "saxophone", label: "Saxophone (not in the app)", sets: [tji("saxophone")], soundfont: "alto_sax" },
  { id: "trumpet", label: "Trumpet (not in the app)", sets: [tji("trumpet")], soundfont: "trumpet" },
  { id: "clarinet", label: "Clarinet (not in the app)", sets: [tji("clarinet")], soundfont: "clarinet" },
];

/** The sample a note is played from (the nearest one, the lower on a tie) and the playback rate that moves it to the note. */
export function sampleFor(set: Pick<SampleSet, "files">, midi: number): { note: number; rate: number } {
  const notes = Object.keys(set.files).map(Number).sort((a, b) => a - b);
  let best = notes[0];
  for (const n of notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n;
  return { note: best, rate: 2 ** ((midi - best) / 12) };
}

/** Cents from `hz` to the equal-tempered pitch of `midi` at A4 = 440, + sharp. */
export const centsFrom = (hz: number, midi: number) => 1200 * Math.log2(hz / (440 * 2 ** ((midi - 69) / 12)));
