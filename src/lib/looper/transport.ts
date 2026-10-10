import { nextBoundary, type Quantise } from "./frames";

/**
 * The looper's transport: the one owner of the beat grid. Play starts it (with a count-in when asked), Stop ends it on the next line.
 * Pure: no Web Audio. The engine makes the metronome, loops and sequencers follow `state` and `anchor`.
 */

export type TransportState = "stopped" | "countIn" | "running" | "stopping";

/** seconds between pressing Play and beat 1 when there is no count-in */
export const TRANSPORT_LEAD = 0.05;

export class Transport {
  state: TransportState = "stopped";
  /** AudioContext time of beat 1 of the grid */
  anchor = 0;
  /** when a "stopping" transport becomes "stopped" */
  stopAt: number | null = null;
  period = 0.6;
  beatsPerBar = 4;

  /** the grid exists and clicks are scheduled */
  get active() {
    return this.state !== "stopped";
  }

  /** heading to play: the transport button shows Stop */
  get going() {
    return this.state === "countIn" || this.state === "running";
  }

  /** New tempo or bar length; the anchor stays, so beat 1 does not move. */
  setTiming(period: number, beatsPerBar: number) {
    if (period > 0) this.period = period;
    if (beatsPerBar >= 1) this.beatsPerBar = Math.round(beatsPerBar);
  }

  /** Start the grid. Returns the anchor (beat 1). While stopping it cancels the stop; while counting in or running it changes nothing. */
  play(now: number, countInBars: number): number {
    if (this.state === "stopping") {
      this.state = now < this.anchor ? "countIn" : "running";
      this.stopAt = null;
      return this.anchor;
    }
    if (this.going) return this.anchor;
    const countIn = Math.max(0, Math.round(countInBars)) * this.beatsPerBar * this.period;
    this.anchor = now + TRANSPORT_LEAD + countIn;
    this.stopAt = null;
    this.state = countIn > 0 ? "countIn" : "running";
    return this.anchor;
  }

  /** Stop on the next line (bar or beat), or now when quantise is off or during the count-in. Returns when it stops. */
  stop(now: number, quantise: Quantise): number {
    if (this.state === "stopped") return now;
    if (this.state === "stopping") return this.stopAt ?? now;
    if (this.state === "countIn" || quantise === "off") {
      this.state = "stopped";
      this.stopAt = null;
      return now;
    }
    this.stopAt = this.next(now, quantise);
    this.state = "stopping";
    return this.stopAt;
  }

  /** Move on with time: countIn becomes running at the anchor, stopping becomes stopped at stopAt. */
  tick(now: number): boolean {
    if (this.state === "countIn" && now >= this.anchor) {
      this.state = "running";
      return true;
    }
    if (this.state === "stopping" && this.stopAt !== null && now >= this.stopAt) {
      this.state = "stopped";
      this.stopAt = null;
      return true;
    }
    return false;
  }

  /** Stop at a known line (the end of a take), or now when it has already passed. Returns when it stops. */
  stopAtTime(now: number, at: number): number {
    if (this.state === "stopped") return now;
    if (at <= now) {
      this.state = "stopped";
      this.stopAt = null;
      return now;
    }
    this.stopAt = at;
    this.state = "stopping";
    return at;
  }

  moveAnchor(anchor: number) {
    this.anchor = anchor;
  }

  /** Move beat 1 to a new anchor; a future one is a fresh count-in. */
  recount(anchor: number, now: number) {
    this.anchor = anchor;
    if (this.going) this.state = anchor > now ? "countIn" : "running";
  }

  /** When something armed starts: on beat 1 after a restart (silent through the count-in), else on the given next beat. */
  joinAt(restart: boolean, nextBeat: number): number {
    return restart ? this.anchor : nextBeat;
  }

  /** The next beat or bar line at least `margin` seconds after now. */
  next(now: number, unit: "beat" | "bar", margin = 0): number {
    const step = unit === "bar" ? this.period * this.beatsPerBar : this.period;
    return nextBoundary(now, this.anchor, step, margin);
  }
}
