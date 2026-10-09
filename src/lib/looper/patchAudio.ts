import { EffectChain } from "./buses";
import { activeLinks, isPatched, type Patch, type PatchNode } from "./patch";

/** What the patch needs from the rest of the engine. Any of these may be missing (not built yet): the link then waits. */
export interface PatchEnv {
  /** the sound of a mixer strip after its effects and fader (the strip id is the number in "in:<id>") */
  tap(stripId: number): AudioNode | null;
  /** a group's bus input */
  bus(groupId: string): AudioNode | null;
  /** the master input */
  master: AudioNode;
  /** the recorder's input */
  recorder: AudioNode;
}

interface Wire {
  gain: GainNode;
  src: AudioNode | null;
  dst: AudioNode | null;
}

const RAMP = 0.015;

const stripOf = (n: PatchNode): number | null => {
  const m = /^in:(\d+)$/.exec(n.id);
  return m ? Number(m[1]) : null;
};

/**
 * Turns the patch into Web Audio nodes. Every connection is a gain node (1 when it carries sound, 0 when it is muted or a
 * switch has chosen another output), so muting and switching only ramp a gain and never rewire or click. Effect chains and
 * switches are real nodes. Sound makers that are not patched (only wired to group recorders) are left to the mixer's own taps.
 * Groups keep their fixed routing into the master; sequencers keep theirs. See spec/patch.md.
 */
export class PatchGraph {
  private chains = new Map<string, { chain: EffectChain; key: string }>();
  private switches = new Map<string, GainNode>();
  private wires = new Map<string, Wire>();
  private recIn = new Map<string, GainNode>();
  private recording: string | null | undefined = undefined;

  constructor(private ctx: AudioContext) {}

  /** Strip ids whose sound is routed by the patch (the mixer silences their own recorder gate and "Hear it"). */
  patchedStrips(p: Patch): Set<number> {
    const out = new Set<number>();
    for (const n of p.nodes) {
      const id = stripOf(n);
      if (id !== null && isPatched(p, n.id)) out.add(id);
    }
    return out;
  }

  /** Bring the audio in line with the patch. Cheap when nothing changed. */
  sync(p: Patch, env: PatchEnv) {
    const byId = new Map(p.nodes.map((n) => [n.id, n]));
    // effect chains and switches
    for (const n of p.nodes) {
      if (n.kind === "fx") {
        const key = JSON.stringify(n.effects ?? []);
        let c = this.chains.get(n.id);
        if (!c) {
          c = { chain: new EffectChain(this.ctx), key: "" };
          this.chains.set(n.id, c);
        }
        if (c.key !== key) {
          c.chain.setEffects(n.effects ?? []);
          c.key = key;
        }
      } else if (n.kind === "switch" && !this.switches.has(n.id)) {
        this.switches.set(n.id, this.ctx.createGain());
      }
    }
    for (const [id, c] of this.chains) {
      if (!byId.has(id)) {
        c.chain.dispose();
        this.chains.delete(id);
      }
    }
    for (const [id, g] of this.switches) {
      if (!byId.has(id)) {
        g.disconnect();
        this.switches.delete(id);
      }
    }
    // recorder inputs of groups
    const groups = new Set(p.nodes.filter((n) => n.kind === "group").map((n) => n.id.slice("group:".length)));
    for (const g of groups) {
      if (!this.recIn.has(g)) {
        const r = this.ctx.createGain();
        r.connect(env.recorder);
        this.recIn.set(g, r);
      }
    }
    for (const [g, r] of this.recIn) {
      if (!groups.has(g)) {
        r.disconnect();
        this.recIn.delete(g);
      }
    }
    this.applyRecording();

    const active = new Set(activeLinks(p).map((l) => l.id));
    const seen = new Set<string>();
    const t = this.ctx.currentTime;
    for (const l of p.links) {
      const a = byId.get(l.from);
      const b = byId.get(l.to);
      if (!a || !b) continue;
      // plain "this input can be recorded" wiring is the mixer's job, and groups and sequencers keep their own routing
      if ((a.kind === "input" || a.kind === "piano") && !isPatched(p, a.id)) continue;
      if (a.kind === "group" || a.kind === "loop" || a.kind === "sequencer" || a.kind === "synth") continue;
      const src = this.outOf(a, env);
      const dst = this.inOf(b, l.port ?? "bus", env);
      seen.add(l.id);
      let w = this.wires.get(l.id);
      if (!w) {
        w = { gain: this.ctx.createGain(), src: null, dst: null };
        w.gain.gain.value = 0;
        this.wires.set(l.id, w);
      }
      if (w.src !== src) {
        this.safe(() => w!.src?.disconnect(w!.gain));
        if (src) src.connect(w.gain);
        w.src = src;
      }
      if (w.dst !== dst) {
        this.safe(() => w!.gain.disconnect());
        if (dst) w.gain.connect(dst);
        w.dst = dst;
      }
      w.gain.gain.setTargetAtTime(src && dst && active.has(l.id) ? 1 : 0, t, RAMP);
    }
    for (const [id, w] of this.wires) {
      if (seen.has(id)) continue;
      this.safe(() => w.src?.disconnect(w.gain));
      this.safe(() => w.gain.disconnect());
      this.wires.delete(id);
    }
  }

  /** Which group is recording now (null = a loop outside every group: every recorder input opens). undefined = none. */
  setRecording(groupId: string | null | undefined) {
    this.recording = groupId;
    this.applyRecording();
  }

  private applyRecording() {
    const t = this.ctx.currentTime;
    for (const [g, r] of this.recIn) {
      const open = this.recording === null || this.recording === g;
      r.gain.setTargetAtTime(open ? 1 : 0, t, 0.002);
    }
  }

  private outOf(n: PatchNode, env: PatchEnv): AudioNode | null {
    if (n.kind === "input" || n.kind === "piano") {
      const id = stripOf(n);
      return id === null ? null : env.tap(id);
    }
    if (n.kind === "fx") return this.chains.get(n.id)?.chain.output ?? null;
    if (n.kind === "switch") return this.switches.get(n.id) ?? null;
    return null;
  }

  private inOf(n: PatchNode, port: "rec" | "bus", env: PatchEnv): AudioNode | null {
    if (n.kind === "fx") return this.chains.get(n.id)?.chain.input ?? null;
    if (n.kind === "switch") return this.switches.get(n.id) ?? null;
    if (n.kind === "master") return env.master;
    if (n.kind === "group") {
      const g = n.id.slice("group:".length);
      return port === "rec" ? this.recIn.get(g) ?? null : env.bus(g);
    }
    return null;
  }

  private safe(f: () => void) {
    try {
      f();
    } catch {
      /* already disconnected */
    }
  }

  dispose() {
    this.wires.forEach((w) => {
      this.safe(() => w.src?.disconnect(w.gain));
      this.safe(() => w.gain.disconnect());
    });
    this.wires.clear();
    this.chains.forEach((c) => c.chain.dispose());
    this.chains.clear();
    this.switches.forEach((g) => this.safe(() => g.disconnect()));
    this.switches.clear();
    this.recIn.forEach((r) => this.safe(() => r.disconnect()));
    this.recIn.clear();
  }
}
