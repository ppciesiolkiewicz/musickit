import { Midi } from "@tonaljs/tonal";

export type Midimessage = {
  type: "noteon" | "noteoff";
  note: number; // MIDI note 0-127
  velocity: number;
  noteName: string; // e.g. "C4", "C#4"
};

export type MidiEventListener = (msg: Midimessage) => void;

let midiAccess: MIDIAccess | null = null;
const listeners = new Set<MidiEventListener>();

function handleMidiMessage(event: MIDIMessageEvent, input: MIDIInput): void {
  if (!event.data) return;
  const [status, data1, data2] = event.data;
  const note = data1;
  const velocity = data2 ?? 0;

  const statusHigh = status & 0xf0;
  const isNoteOn = statusHigh === 0x90;
  const isNoteOff = statusHigh === 0x80;

  if ((isNoteOn && velocity > 0) || isNoteOff) {
    const noteName = Midi.midiToNoteName(note, { sharps: true });
    if (!noteName) return;

    listeners.forEach((cb) =>
      cb({
        type: isNoteOn ? "noteon" : "noteoff",
        note,
        velocity,
        noteName,
      })
    );
  } else if (isNoteOn && velocity === 0) {
    const noteName = Midi.midiToNoteName(note, { sharps: true });
    if (!noteName) return;
    listeners.forEach((cb) =>
      cb({
        type: "noteoff",
        note,
        velocity: 0,
        noteName,
      })
    );
  }
}

function attachToInputs(access: MIDIAccess): void {
  access.inputs.forEach((input) => {
    input.onmidimessage = (e) => handleMidiMessage(e, input);
  });
}

export function addMidiListener(cb: MidiEventListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function requestMidiAccess(): Promise<{
  success: boolean;
  error?: string;
  inputCount?: number;
}> {
  if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
    return { success: false, error: "Web MIDI API not supported" };
  }

  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess = access;
    attachToInputs(access);

    access.onstatechange = () => {
      if (midiAccess) attachToInputs(midiAccess);
    };

    return { success: true, inputCount: access.inputs.size };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to access MIDI",
    };
  }
}

export function getMidiInputs(): MIDIInput[] {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values());
}
