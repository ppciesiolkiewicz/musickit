/**
 * Music theory calculator for planning lessons: run instead of working fretboard facts out by hand.
 * Every answer comes from the same chordKit/theory code the app draws with, so frets and boxes match the screen.
 *
 *   npx tsx scripts/theory.ts help
 *
 * Strings are listed low E to high e. Tabs read low E first: "x-3-2-0-1-0" is open C.
 */
import { Chord } from "@tonaljs/tonal";
import { FAMILIES, MODE_LIST, TONICS, makeKeyContext, modeAlias, shortModeName, type KeyContext } from "../src/features/theory/theory";
import { modeChords } from "../src/features/theory/scales";
import { CAGED_LETTERS, boxCells, boxChords, boxScaleChords, cagedBoxes, type CagedBox, type CagedLetter, type CagedQuality } from "../src/lib/chordKit/caged";
import { neighbours, ruleLetter } from "../src/lib/chordKit/neighbours";
import { positionsFor, type PositionKind, type ScaleCell } from "../src/lib/chordKit/scalePositions";
import { INVERSIONS, STRING_GROUPS, TRIAD_QUALITIES, triadVoicings, type TriadQuality } from "../src/lib/chordKit/triads";
import { DYAD_STEPS, diatonicDyads, dyadPairs, type DyadInterval } from "../src/lib/chordKit/scaleChords";

const HELP = `theory <command> [args] [--flags]       keys: C F# Bb f♯ …   modes: major minor dorian "harmonic minor" "phrygian dominant" …

  scale <key> [mode]                       notes, degrees and the chord on every degree (triad, 7th, tones)
  boxes <key> [major|minor]                the five CAGED boxes: chord shape, root fret, fret window
  box <key> <major|minor> <C|A|G|E|D>      one box: window, scale notes per string, chords of the key inside it
        [--arp triad|seventh]
  triads <key> [mode]                      closed triads of the key's chords (3 adjacent strings, every inversion)
        [--box C|A|G|E|D]                    … only inside that CAGED box of the key
        [--frets 5-8]                        … only inside these frets
        [--slack 1]                          … let voicings reach this many frets past the window
        [--group 321,432]                    … only these string groups (654 543 432 321)
        [--chords I,IV,V]                    … only these degrees (roman, any case, or 1-7)
  dyads <key> [mode]                       double stops of the scale: two notes 3rds, 4ths or 6ths apart, in the key
        [--interval 3|4|6]                   … 3rds (default), 4ths, or 6ths (one string between)
        [--strings 21,32]                    … only these string pairs (guitar numbers, 1 = high e)
        [--box C|A|G|E|D] [--frets 5-8] [--slack 1]   … as for triads
  neighbours <key> <C|A|G|E|D>             I IV V ii vi iii: the shape of each that sits in the I chord's box
  positions <key> [mode] [pentatonic|scale|3nps]
                                           the scale positions the app draws, with notes per string
  fit <chord> [chord …]                    keys and modes that contain all the chords, with their roman numerals
`;

/* ---------------------------------------------------------------- parsing */

const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function fail(msg: string): never {
  console.error(`theory: ${msg}  (see: theory help)`);
  process.exit(1);
}

function parseKey(s: string | undefined): number {
  const m = s?.trim().match(/^([a-g])([#♯b♭]*)$/i);
  if (!m) fail(`not a key: ${s ?? "(missing)"}`);
  const shift = [...m[2]].reduce((n, c) => n + (c === "#" || c === "♯" ? 1 : -1), 0);
  return (((LETTER_PC[m[1].toLowerCase()] + shift) % 12) + 12) % 12;
}

const norm = (s: string) => s.toLowerCase().replace(/♭/g, "b").replace(/♯/g, "#").replace(/♮/g, "n").replace(/[^a-z0-9#]/g, "");
const MODE_ALIASES: Record<string, string> = { major: "ionian", minor: "aeolian", naturalminor: "aeolian" };

function parseMode(s: string | undefined): { familyIndex: number; modeIndex: number } {
  if (!s) return { familyIndex: 0, modeIndex: 0 };
  const want = MODE_ALIASES[norm(s)] ?? norm(s);
  for (let fi = 0; fi < FAMILIES.length; fi++) {
    const k = FAMILIES[fi].names.findIndex((n) => norm(shortModeName(n)) === want || norm(n) === want);
    if (k >= 0) return { familyIndex: fi, modeIndex: k };
  }
  fail(`unknown mode: ${s}. Known: ${MODE_LIST.map((m) => m.name).join(", ")}`);
}

function parseLetter(s: string | undefined): CagedLetter {
  const l = s?.toUpperCase();
  if (!l || !(CAGED_LETTERS as readonly string[]).includes(l)) fail(`not a CAGED shape: ${s ?? "(missing)"} (use C A G E D)`);
  return l as CagedLetter;
}

function parseQuality(s: string | undefined): CagedQuality {
  const q = norm(s ?? "major");
  if (q === "major" || q === "maj" || q === "ionian") return "major";
  if (q === "minor" || q === "min" || q === "m" || q === "aeolian") return "minor";
  fail(`CAGED boxes are major or minor, not ${s}`);
}

/** Positional args and --flags (a flag always takes the next word). */
function parseArgs(argv: string[]): { pos: string[]; flags: Record<string, string> } {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i] ?? "";
    else pos.push(argv[i]);
  }
  return { pos, flags };
}

/* ---------------------------------------------------------------- formatting */

const tab = (frets: (number | null)[]) => frets.map((f) => (f === null ? "x" : String(f))).join("-");
const range = (from: number, to: number) => `${from}-${to}`;
const keyName = (ctx: KeyContext) => `${ctx.names[0]} ${modeAlias(ctx.familyIndex, ctx.modeIndex)?.toLowerCase() ?? ctx.modeName}`;

/** Fret numbers per string of a shape placed at a root fret. */
const placed = (f: (number | null)[], rootFret: number) => f.map((v) => (v === null ? null : rootFret + v));

/** Notes on one string as "fret:name(degree)", low fret first. */
const stringLine = (cells: { fret: number; name: string; degreeText: string }[]) => cells.map((c) => `${c.fret}:${c.name}(${c.degreeText})`).join(" ");

/** JSON, with any array or object that fits in 110 characters kept on one line. */
function format(v: unknown, indent = ""): string {
  const flat = JSON.stringify(v);
  if (flat === undefined || indent.length + flat.length <= 110 || v === null || typeof v !== "object") return flat ?? "null";
  const inner = indent + "  ";
  if (Array.isArray(v)) return `[\n${v.map((x) => inner + format(x, inner)).join(",\n")}\n${indent}]`;
  const entries = Object.entries(v as Record<string, unknown>).map(([k, x]) => `${inner}${JSON.stringify(k)}: ${format(x, inner)}`);
  return `{\n${entries.join(",\n")}\n${indent}}`;
}

const print = (v: unknown) => console.log(format(v));

/* ---------------------------------------------------------------- commands */

function scale(pos: string[]) {
  const { familyIndex, modeIndex } = parseMode(pos[1]);
  const ctx = makeKeyContext(parseKey(pos[0]), familyIndex, modeIndex);
  return {
    key: keyName(ctx),
    family: FAMILIES[familyIndex].label,
    parent: FAMILIES[familyIndex].scales ? null : `${ctx.parentTonic} ${FAMILIES[familyIndex].parentName}`,
    notes: ctx.names,
    semitones: ctx.steps,
    chords: modeChords(ctx).map((c) => ({
      roman: c.roman,
      triad: c.triadName,
      seventh: c.seventhName,
      tones: c.notes.slice(0, 4).map((n) => `${n.name}(${n.role})`),
    })),
  };
}

const boxSummary = (b: CagedBox) => ({ shape: b.letter, chord: b.chordName, tab: tab(b.frets), rootFret: b.rootFret, chordFrets: range(b.lo, b.hi), window: range(b.from, b.to) });

function boxes(pos: string[]) {
  const q = parseQuality(pos[1]);
  return cagedBoxes(parseKey(pos[0]), q).map(boxSummary);
}

function findBox(rootPc: number, q: CagedQuality, letter: CagedLetter): CagedBox {
  return cagedBoxes(rootPc, q).find((b) => b.letter === letter)!;
}

function box(pos: string[], flags: Record<string, string>) {
  const rootPc = parseKey(pos[0]);
  const q = parseQuality(pos[1]);
  const b = findBox(rootPc, q, parseLetter(pos[2]));
  const arpKind = flags.arp === "seventh" ? "seventh" : "triad";
  const cells = boxCells(rootPc, q, b, arpKind).filter((c) => c.inScale);
  return {
    ...boxSummary(b),
    legend: "fret:note(degree); pent = notes of the pentatonic, arp = notes of the " + arpKind,
    strings: Object.fromEntries(
      STRING_NAMES.map((name, s) => {
        const mine = cells.filter((c) => c.string === s);
        return [name, { scale: stringLine(mine), pent: stringLine(mine.filter((c) => c.inPent)), arp: stringLine(mine.filter((c) => c.arpRole)) }];
      }).reverse(),
    ),
    keyChordsInBox: boxScaleChords(rootPc, q, b).map((c) => ({ roman: c.roman, chord: c.name, tab: tab(placed(c.shape.f, c.rootFret)) })),
    otherChordsOnRoot: boxChords(rootPc, q, b).map((c) => ({ chord: c.name, tab: tab(placed(c.shape.f, c.rootFret)), difficulty: c.shape.diff })),
  };
}

const ROMAN_INDEX: Record<string, number> = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

function parseDegrees(s: string | undefined): Set<number> | null {
  if (!s) return null;
  return new Set(
    s.split(",").map((x) => {
      const t = x.trim();
      if (/^[1-7]$/.test(t)) return Number(t) - 1;
      const r = ROMAN_INDEX[t.toLowerCase().replace(/[^iv]/g, "")];
      if (r === undefined) fail(`not a degree: ${t}`);
      return r;
    }),
  );
}

type FretWindow = { from: number; to: number; source: string };

/** The frets asked for: a CAGED box of the key (--box) or a range (--frets); null for the whole neck. */
function windowOf(ctx: KeyContext, flags: Record<string, string>): FretWindow | null {
  if (flags.box) {
    const tonicTri = ctx.chords[0].tri;
    if (tonicTri !== "maj" && tonicTri !== "min") fail(`${keyName(ctx)} has no major or minor tonic, so no CAGED box`);
    const b = findBox(ctx.tonic.pc, tonicTri === "maj" ? "major" : "minor", parseLetter(flags.box));
    return { from: b.from, to: b.to, source: `${b.letter} shape of ${b.chordName}` };
  }
  if (flags.frets) {
    const m = flags.frets.match(/^(\d+)-(\d+)$/);
    if (!m) fail(`--frets wants a range like 5-8, not ${flags.frets}`);
    return { from: Number(m[1]), to: Number(m[2]), source: "frets" };
  }
  return null;
}

/** Frets inside the window (± slack); an open string only counts in a window that starts at the nut. */
function inWindow(frets: number[], win: FretWindow | null, slack: number): boolean {
  if (!win) return true;
  const fretted = frets.filter((f) => f > 0);
  const lo = fretted.length ? Math.min(...fretted) : 0;
  return lo >= win.from - slack && Math.max(...frets) <= win.to + slack && (win.from - slack <= 0 || fretted.length === frets.length);
}

function triads(pos: string[], flags: Record<string, string>) {
  const rootPc = parseKey(pos[0]);
  const { familyIndex, modeIndex } = parseMode(pos[1]);
  const ctx = makeKeyContext(rootPc, familyIndex, modeIndex);
  const chords = modeChords(ctx);

  const win = windowOf(ctx, flags);
  const slack = Number(flags.slack ?? 0);
  const groups = flags.group ? STRING_GROUPS.filter((g) => flags.group.split(",").includes(g.id)) : STRING_GROUPS;
  if (!groups.length) fail(`unknown string group ${flags.group} (use 654 543 432 321)`);
  const only = parseDegrees(flags.chords);

  const out = ctx.chords.flatMap((c, d) => {
    if (only && !only.has(d)) return [];
    if (!TRIAD_QUALITIES.some((q) => q.id === c.tri)) return [{ roman: c.roman, chord: c.triadName, voicings: [], note: "not a major/minor/dim/aug triad" }];
    const toneNames = [0, 1, 2].map((i) => chords[d].notes[i]);
    const voicings = groups.flatMap((g) =>
      ([0, 1, 2] as const).flatMap((inv) =>
        triadVoicings((rootPc + ctx.steps[d]) % 12, c.tri as TriadQuality, inv, g)
          .filter((v) => inWindow(v.frets, win, slack))
          .map((v) => ({
            strings: g.id,
            inversion: INVERSIONS[inv].short,
            frets: v.frets.join("-"),
            notes: v.tones.map((t) => `${toneNames[t].name}(${toneNames[t].role})`).join(" "),
            lowestFret: v.lowestFret,
          })),
      ),
    );
    voicings.sort((a, b) => a.lowestFret - b.lowestFret || b.strings.localeCompare(a.strings));
    return [{ roman: c.roman, chord: c.triadName, voicings: voicings.map((v) => `${v.strings} ${v.inversion.padEnd(8)} ${v.frets.padEnd(8)} ${v.notes}`) }];
  });
  return {
    key: keyName(ctx),
    window: win ? `${range(win.from, win.to)}${slack ? ` ±${slack}` : ""} (${win.source})` : "whole neck 0-17",
    legend: "string group (6 = low E … 1 = high e) · inversion · frets low string first · notes(role)",
    chords: out,
  };
}

const GUITAR_NUMBER = (i: number) => 6 - i;

function dyads(pos: string[], flags: Record<string, string>) {
  const { familyIndex, modeIndex } = parseMode(pos[1]);
  const ctx = makeKeyContext(parseKey(pos[0]), familyIndex, modeIndex);
  const interval = Number(flags.interval ?? 3);
  if (!(interval in DYAD_STEPS)) fail(`--interval is 3, 4 or 6, not ${flags.interval}`);
  const iv = interval as DyadInterval;
  const all = dyadPairs(iv);
  const pairs = flags.strings
    ? flags.strings.split(",").map((id) => {
        const p = all.find(([lo, hi]) => `${GUITAR_NUMBER(lo)}${GUITAR_NUMBER(hi)}` === id.trim());
        if (!p) fail(`strings ${id} don't hold a ${iv === 6 ? "6th (one string between: 31 42 53 64)" : `${iv === 3 ? "3rd" : "4th"} (neighbours: 21 32 43 54 65)`}`);
        return p;
      })
    : all;
  const win = windowOf(ctx, flags);
  const slack = Number(flags.slack ?? 0);
  const sizes: Record<number, string> = { 3: "m3", 4: "M3", 5: "P4", 6: "tritone", 8: "m6", 9: "M6" };
  return {
    key: keyName(ctx),
    interval: `${iv === 3 ? "3rds" : iv === 4 ? "4ths" : "6ths"} (scale notes ${DYAD_STEPS[iv]} steps apart)`,
    window: win ? `${range(win.from, win.to)}${slack ? ` ±${slack}` : ""} (${win.source})` : "whole neck 0-17",
    legend: "strings (1 = high e) · frets low string first · lower + upper note (scale degree) · size",
    pairs: pairs.map(([lo, hi]) => ({
      strings: `${GUITAR_NUMBER(lo)}${GUITAR_NUMBER(hi)} (${STRING_NAMES[lo]} ${STRING_NAMES[hi]})`,
      dyads: diatonicDyads(ctx, iv, [lo, hi])
        .filter((d) => inWindow(d.frets, win, slack))
        .sort((a, b) => a.lowestFret - b.lowestFret || a.degree - b.degree)
        .map((d) => `${d.frets.join("-").padEnd(6)} ${ctx.names[d.degree]}(${d.degree + 1}) + ${ctx.names[d.upper]}(${d.upper + 1})  ${sizes[d.semis] ?? d.semis}`),
    })),
  };
}

function neighbourCmd(pos: string[]) {
  const rootPc = parseKey(pos[0]);
  const letter = parseLetter(pos[1]);
  const home = findBox(rootPc, "major", letter);
  return {
    home: boxSummary(home),
    neighbours: neighbours(rootPc, letter).map((n) => ({
      roman: n.roman,
      chord: n.name,
      shape: n.letter,
      ruleSays: ruleLetter(letter, n.roman),
      tab: n.box ? tab(n.box.frets) : null,
      window: n.box ? range(n.box.from, n.box.to) : null,
    })),
  };
}

function positions(pos: string[]) {
  const rest = pos.slice(1);
  const kinds: PositionKind[] = ["pentatonic", "scale", "3nps"];
  const kind = (rest.find((x) => (kinds as string[]).includes(x)) ?? "scale") as PositionKind;
  const modeArg = rest.filter((x) => !(kinds as string[]).includes(x)).join(" ") || undefined;
  const { familyIndex, modeIndex } = parseMode(modeArg);
  const ctx = makeKeyContext(parseKey(pos[0]), familyIndex, modeIndex);
  const line = (notes: ScaleCell[]) =>
    Object.fromEntries(STRING_NAMES.map((name, s) => [name, stringLine(notes.filter((n) => n.string === s))]).reverse());
  return {
    key: keyName(ctx),
    kind,
    positions: positionsFor(ctx, kind).map((p) => ({
      number: p.number,
      window: range(p.from, p.to),
      strings: line(p.notes),
      ...(p.alt ? { alt: line(p.alt.notes) } : {}),
    })),
  };
}

const ascii = (s: string) => s.replace(/♭/g, "b").replace(/♯/g, "#");

function fit(pos: string[]) {
  if (!pos.length) fail("fit wants at least one chord, e.g. fit Am F C G");
  const chords = pos.map((sym) => {
    const c = Chord.get(ascii(sym));
    if (c.empty || c.tonic === null) fail(`can't read chord ${sym}`);
    return { sym, root: parseKey(c.tonic!), pcs: c.notes.map(parseKey) };
  });
  const out: { key: string; romans: string[] }[] = [];
  for (const t of TONICS) {
    FAMILIES.forEach((fam, fi) =>
      fam.names.forEach((_, k) => {
        const ctx = makeKeyContext(t.pc, fi, k);
        const inScale = new Set(ctx.steps.map((s) => (t.pc + s) % 12));
        if (!chords.every((c) => c.pcs.every((p) => inScale.has(p)))) return;
        const romans = chords.map((c) => {
          const d = ctx.steps.findIndex((s) => (t.pc + s) % 12 === c.root);
          return `${c.sym}=${ctx.chords[d].roman}`;
        });
        out.push({ key: keyName(ctx), romans });
      }),
    );
  }
  return { chords: chords.map((c) => c.sym), keys: out.map((o) => `${o.key}: ${o.romans.join(" ")}`) };
}

/* ---------------------------------------------------------------- main */

const { pos, flags } = parseArgs(process.argv.slice(2));
const [cmd, ...args] = pos;
const COMMANDS: Record<string, () => unknown> = {
  scale: () => scale(args),
  boxes: () => boxes(args),
  box: () => box(args, flags),
  triads: () => triads(args, flags),
  dyads: () => dyads(args, flags),
  neighbours: () => neighbourCmd(args),
  neighbors: () => neighbourCmd(args),
  positions: () => positions(args),
  fit: () => fit(args),
};
if (!cmd || cmd === "help" || !COMMANDS[cmd]) {
  if (cmd && cmd !== "help") console.error(`theory: unknown command ${cmd}\n`);
  console.log(HELP);
  process.exit(cmd && cmd !== "help" ? 1 : 0);
}
print(COMMANDS[cmd]());
