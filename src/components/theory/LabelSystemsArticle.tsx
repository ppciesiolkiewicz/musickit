"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { strum } from "@/features/sound";
import { DOT_INK, MAJOR, degreeColour, fmtDegree, intervalName, makeKeyContext, scaleToneLabel, solfege, type KeyContext } from "@/features/theory";
import { LabelSelect, useLabelSystem } from "@/features/theory/useLabelSystem";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { btnSm } from "@/components/ui";
import MiniPiano from "./MiniPiano";
import NoteNeck, { type NeckDot } from "./NoteNeck";

const H2 = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id} className="mt-4 scroll-mt-4 text-lg font-light text-slate-100">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{children}</p>;
const Fig = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <figure className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
    {children}
    <figcaption className="text-xs text-slate-400">{caption}</figcaption>
  </figure>
);

const SECTIONS = [
  ["four", "Four ways to name a note"],
  ["solfege", "Solfège"],
  ["chromatic", "All twelve notes"],
  ["minor", "Minor keys"],
  ["instruments", "Piano vs guitar"],
];

/** Every semitone above Do: its interval, its spellings as a degree (lowered first, as the app writes them) and their syllables. */
const CHROMATIC: { semi: number; degrees: string[] }[] = [
  { semi: 0, degrees: ["R"] },
  { semi: 1, degrees: ["♭2", "♯1"] },
  { semi: 2, degrees: ["2"] },
  { semi: 3, degrees: ["♭3", "♯2"] },
  { semi: 4, degrees: ["3"] },
  { semi: 5, degrees: ["4"] },
  { semi: 6, degrees: ["♭5", "♯4"] },
  { semi: 7, degrees: ["5"] },
  { semi: 8, degrees: ["♭6", "♯5"] },
  { semi: 9, degrees: ["6"] },
  { semi: 10, degrees: ["♭7", "♯6"] },
  { semi: 11, degrees: ["7"] },
];

const C_MAJOR = makeKeyContext(0, 0, 0);
const EB_MAJOR = makeKeyContext(3, 0, 0);
const G_MAJOR = makeKeyContext(7, 0, 0);

/** The major scale from `ctx`'s tonic up an octave on the mini piano, each key labelled in the chosen system. */
function PianoScale({ ctx, from }: { ctx: KeyContext; from: number }) {
  const [system] = useLabelSystem();
  const root = from + ((ctx.tonic.pc - from) % 12 + 12) % 12;
  const lit = [...MAJOR, 12].map((s, i) => ({ midi: root + s, label: scaleToneLabel(system, ctx, i % 7), colour: degreeColour(i % 7) }));
  return <MiniPiano from={from} lit={lit} onKey={(m) => strum([m], { gapMs: 0, holdMs: 1200 })} />;
}

/** The one-octave-and-a-bit major scale box with its root on the low E string at `rootFret`. */
function guitarDots(ctx: KeyContext, rootFret: number, system: Parameters<typeof scaleToneLabel>[0]): NeckDot[] {
  const rootMidi = OPEN_MIDI[0] + rootFret;
  const dots: NeckDot[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = Math.max(0, rootFret - 1); f <= rootFret + 3; f++) {
      const rel = ((OPEN_MIDI[s] + f - rootMidi) % 12 + 12) % 12;
      const i = MAJOR.indexOf(rel);
      if (i < 0) continue;
      dots.push({ string: s, fret: f, label: scaleToneLabel(system, ctx, i), fill: degreeColour(i), text: DOT_INK, big: i === 0 });
    }
  }
  return dots;
}

function GuitarScale({ ctx, rootFret }: { ctx: KeyContext; rootFret: number }) {
  const [system] = useLabelSystem();
  return <NoteNeck from={Math.max(0, rootFret - 2)} to={rootFret + 4} dots={guitarDots(ctx, rootFret, system)} compact />;
}

/** The piano page's article: the four label systems (names, intervals, degrees, solfège) and why piano and guitar players lean on different ones. */
export default function LabelSystemsArticle() {
  return (
    <article className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-4">
      <nav aria-label="On this page" className="flex flex-wrap gap-1.5">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className={btnSm}>{label}</a>)}
      </nav>

      <H2 id="four">Four ways to name a note</H2>
      <P>
        Every diagram in attunr can label its notes four ways. They answer different questions, and switching between them is one of the
        quickest ways to learn a key. Pick one here and every keyboard and neck on this page (and the rest of the site) follows.
      </P>
      <LabelSelect className="max-w-xs" />
      <ul className="max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li><b>Note names</b> (C, E, G): <i>which</i> note it is. Fixed: a C is a C in every key.</li>
        <li><b>Intervals</b> (R, ♭3, p5): how far the note is from the root, counted in semitones and named the way a chord formula is.</li>
        <li><b>Scale degrees</b> (R, ♭3, 5): the note&apos;s place in the key, with the root written R, written against the major scale, so ♭3 means &ldquo;a semitone below the major scale&apos;s 3rd&rdquo;.</li>
        <li><b>Solfège</b> (Do, Me, Sol): the same degrees as singable syllables, one syllable per note.</li>
      </ul>
      <P>
        Intervals, degrees and solfège are all <i>relative</i>: they describe a note by its job in the key, not by its pitch. Move to another
        key and the names change, but the relative labels stay put. That is why a melody that is &ldquo;Do Re Mi&rdquo; is the same tune in any key.
      </P>

      <H2 id="solfege">Solfège</H2>
      <P>
        attunr uses <b>movable do</b>: Do is always the tonic of the key you pick. In C major Do is C; in E♭ major Do is E♭. The seven notes of
        the major scale are <b>Do Re Mi Fa Sol La Ti</b> (Ti is sometimes written Si, from the older Italian names). Tap a key to hear it.
      </P>
      <div className="grid gap-2 lg:grid-cols-2">
        <Fig caption="C major: the white keys from C. Do is C."><PianoScale ctx={C_MAJOR} from={48} /></Fig>
        <Fig caption="E♭ major: three black keys, but the same Do Re Mi. Do is E♭."><PianoScale ctx={EB_MAJOR} from={48} /></Fig>
      </div>
      <P>
        Many countries (France, Italy, Spain, much of Latin America and Eastern Europe) use <b>fixed do</b> instead, where Do is simply the
        name of C, Re is D and so on: there solfège is a set of note names, not a relative system. Both are correct; they just answer different
        questions. Fixed do is the &ldquo;Note names&rdquo; option above in different words.
      </P>

      <H2 id="chromatic">All twelve notes</H2>
      <P>
        Notes outside the major scale change their vowel. A raised note ends in <b>-i</b> (Di, Ri, Fi, Si, Li); a lowered one ends in <b>-e</b>
        (Ra, Me, Se, Le, Te; Re lowered becomes Ra because Re is taken). So ♭3 is <b>Me</b> (&ldquo;may&rdquo;), ♭5 is <b>Se</b> (&ldquo;say&rdquo;) and ♯4 is <b>Fi</b> (&ldquo;fee&rdquo;):
        the same key on the piano, named for the job it does. ♭5 is never Sol; Sol is always the perfect 5th. Click a row to hear the note against Do.
      </P>
      <div className="overflow-x-auto">
        <table className="w-full max-w-3xl text-left text-xs text-slate-300">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-4 font-normal">Semitones</th>
              <th className="py-1 pr-4 font-normal">Interval</th>
              <th className="py-1 pr-4 font-normal">Degree</th>
              <th className="py-1 pr-4 font-normal">Solfège</th>
              <th className="py-1 font-normal">In C</th>
            </tr>
          </thead>
          <tbody>
            {CHROMATIC.map(({ semi, degrees }) => (
              <tr key={semi} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/60" onClick={() => strum(semi ? [60, 60 + semi] : [60], { gapMs: 350, holdMs: 1400 })}>
                <td className="py-1 pr-4 tabular-nums">{semi}</td>
                <td className="py-1 pr-4">{intervalName(semi)}</td>
                <td className="py-1 pr-4">{degrees.map(fmtDegree).join(" / ")}</td>
                <td className="py-1 pr-4 font-medium text-slate-100">{degrees.map((d) => solfege(d)).join(" / ")}</td>
                <td className="py-1">{["C", "D♭ / C♯", "D", "E♭ / D♯", "E", "F", "G♭ / F♯", "G", "A♭ / G♯", "A", "B♭ / A♯", "B"][semi]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Which spelling a page shows depends on the scale: Lydian raises the 4th, so its 4th is Fi; Locrian lowers the 5th, so its 5th is Se.
        Both are the same key on the piano, six semitones above Do.
      </P>

      <H2 id="minor">Minor keys</H2>
      <P>
        There are two traditions for minor. <b>Do-based minor</b> keeps Do on the tonic and lowers the 3rd, 6th and 7th: Do Re <b>Me</b> Fa Sol <b>Le Te</b>.
        <b> La-based minor</b> starts the minor scale on La, so natural minor is La Ti Do Re Mi Fa Sol, the same syllables as its relative major.
        attunr uses do-based minor, the same way it writes degrees: the tonic is always Do and R, and every mode is read against the major scale.
        That makes the colour of each mode easy to see: Dorian is minor with La, Phrygian is minor with Ra, Mixolydian is major with Te.
        Compare them on the <Link href="/theory/scales" className="text-sky-300 hover:underline">scales</Link> page.
      </P>

      <H2 id="instruments">Piano vs guitar</H2>
      <P>
        On a piano every key has one place, so <b>note names</b> come first: you see the white and black keys, and each key you play in has its
        own pattern of them. C major is all white keys; E♭ major needs three black ones. The relative labels are what make two such different
        patterns sound like the same thing.
      </P>
      <P>
        On a guitar the same note sits in several places and every shape is <b>movable</b>: slide it up the neck and it plays in a new key with the
        same fingering. So guitarists tend to think in <b>intervals and degrees</b> first and note names second: a shape is a set of jobs (root,
        3rd, 5th), wherever you put it. Solfège works the same way and adds a sound you can sing.
      </P>
      <div className="grid gap-2 lg:grid-cols-2">
        <Fig caption="G major, root on the 6th string at fret 3."><GuitarScale ctx={G_MAJOR} rootFret={3} /></Fig>
        <Fig caption="C major: the same shape moved to fret 8. Same degrees, same syllables, different notes."><GuitarScale ctx={C_MAJOR} rootFret={8} /></Fig>
      </div>
      <P>
        Switch the labels above between Note names and Solfège and watch the two instruments trade places: on the piano the names stay easy and
        the pattern changes; on the guitar the pattern stays the same and only the names change. Learning both views is what lets you play a
        tune by ear in any key on either instrument. To see the same idea on the whole neck, open
        the <Link href="/theory/scales" className="text-sky-300 hover:underline">scales</Link> and
        the <Link href="/theory/caged" className="text-sky-300 hover:underline">CAGED</Link> pages.
      </P>
    </article>
  );
}
