import { chordAt, eventsBetween, type Arrangement, type NoteEvent } from "./arrange";

/**
 * What the band plays over time: the arrangement going round, and a new one taking over on the next bar line when the
 * person changes the progression, key or style mid-song. Pure (no audio, no clock), tested; the band asks it for
 * the notes of each scheduling window in song beats.
 */

interface Segment {
  arr: Arrangement;
  /** the song beat where this arrangement's beat 0 falls (it repeats from there) */
  origin: number;
  /** the song beat it took over */
  from: number;
}

export interface SongPosition {
  /** index of the sounding chord in the arrangement's chords */
  chord: number;
  /** 0-based beat in the bar */
  beat: number;
  beatsPerBar: number;
  arr: Arrangement;
}

const EPS = 1e-9;

export class Song {
  private segments: Segment[];
  private pending: { arr: Arrangement; restart: boolean } | null = null;

  constructor(arr: Arrangement) {
    this.segments = [{ arr, origin: 0, from: 0 }];
  }

  private get last(): Segment {
    return this.segments[this.segments.length - 1];
  }

  /** The arrangement playing now, or about to (the pending one once queued, so the screen shows what was chosen). */
  get arrangement(): Arrangement {
    return this.pending?.arr ?? this.last.arr;
  }

  /** Swap at once (while stopped): the song starts again from beat 0. */
  reset(arr: Arrangement): void {
    this.segments = [{ arr, origin: 0, from: 0 }];
    this.pending = null;
  }

  /**
   * Take `arr` over on the first bar line the band has not scheduled yet. `restart` starts it from its first chord
   * (a new progression); otherwise it carries on where the song is (a new style or key keeps the place in the progression).
   */
  queue(arr: Arrangement, restart: boolean): void {
    this.pending = { arr, restart };
  }

  /** The notes between song beats `from` and `to` (`from` is where the last window ended), each with its song beat. */
  take(from: number, to: number): { at: number; ev: NoteEvent }[] {
    const out: { at: number; ev: NoteEvent }[] = [];
    let cursor = from;
    if (this.pending) {
      const seg = this.last;
      const bpb = seg.arr.beatsPerBar || 4;
      const at = seg.origin + Math.ceil((from - seg.origin) / bpb - EPS) * bpb;
      if (at < to) {
        out.push(...eventsBetween(seg.arr, seg.origin, cursor, at));
        const { arr, restart } = this.pending;
        this.pending = null;
        // keep the bar count going round the new progression, or start it from its top
        const origin = restart || arr.beatsPerBar !== seg.arr.beatsPerBar ? at : seg.origin;
        this.segments.push({ arr, origin, from: at });
        if (this.segments.length > 2) this.segments.shift();
        cursor = at;
      }
    }
    const seg = this.last;
    out.push(...eventsBetween(seg.arr, seg.origin, cursor, to));
    return out;
  }

  /** Where song beat `beat` falls (for the screen: the chord to light, the beat dot). */
  position(beat: number): SongPosition | null {
    const seg = [...this.segments].reverse().find((s) => beat >= s.from - EPS) ?? this.segments[0];
    const { arr } = seg;
    if (arr.beats <= 0 || !arr.chords.length) return null;
    const inLoop = (((beat - seg.origin) % arr.beats) + arr.beats) % arr.beats;
    const bpb = arr.beatsPerBar;
    return { chord: chordAt(arr.chords, inLoop), beat: Math.floor((((inLoop % bpb) + bpb) % bpb) + EPS) % bpb, beatsPerBar: bpb, arr };
  }
}
