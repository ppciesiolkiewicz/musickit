/**
 * The band's tempo map: song beats ↔ AudioContext seconds. Pure, tested.
 *
 * The tempo can change while the band plays. A change takes effect at a beat that is not scheduled yet (`setTempo(bpm, at)`):
 * everything before it keeps the old timing, everything after follows the new one, so nothing already scheduled jumps and
 * the samples are never stretched (the notes are simply started at new times).
 */

export const MIN_BPM = 40;
export const MAX_BPM = 220;

export const clampBpm = (bpm: number, fallback = 100): number => (Number.isFinite(bpm) ? Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm))) : fallback);

export class TempoClock {
  private anchorTime: number;
  private anchorBeat = 0;
  private bpmNow: number;

  /** beat 0 at `startTime` */
  constructor(bpm: number, startTime: number) {
    this.bpmNow = clampBpm(bpm);
    this.anchorTime = startTime;
  }

  get bpm(): number {
    return this.bpmNow;
  }

  get beatSeconds(): number {
    return 60 / this.bpmNow;
  }

  timeAt(beat: number): number {
    return this.anchorTime + (beat - this.anchorBeat) * this.beatSeconds;
  }

  beatAt(time: number): number {
    return this.anchorBeat + (time - this.anchorTime) / this.beatSeconds;
  }

  /** Play at `bpm` from song beat `at` on (a beat not scheduled yet); the beats before it keep their times. */
  setTempo(bpm: number, at: number): void {
    const time = this.timeAt(at);
    this.bpmNow = clampBpm(bpm, this.bpmNow);
    this.anchorBeat = at;
    this.anchorTime = time;
  }
}
