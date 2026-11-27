import type { Article } from "../model";

export const majorAndMinorChords: Article = {
  slug: "major-and-minor-chords",
  title: "Major and minor: what's the difference?",
  metaTitle: "Major vs Minor Chords: Hear and See the Difference · attunr",
  description: "What makes a chord major or minor? One note, the 3rd. See it on interactive chord boxes, hear it, and learn to tell major from minor by ear.",
  intro: "A visual, interactive look at what makes a chord or a scale major or minor: one note, the 3rd. Play the pairs, then learn to hear the difference.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar", "theory"],
  blocks: [
    { type: "p", text: "Major sounds bright and minor sounds darker. You can hear that long before you know why." },
    { type: "p", text: "The why is small: a major chord and a minor chord on the same root share two of their three notes. Only one note moves, the 3rd, and it moves one fret. Once you know which note that is, you can turn any chord you know from major to minor and back." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Play slowly and lightly. A few relaxed minutes beat an hour of tired hands.",
    ] },
    { type: "guide", slug: "intervals-and-solfege", text: "New to intervals like the 3rd? This guide names every note from Do, on a piano and on the guitar neck." },

    { type: "exercise", title: "1. One finger turns major into minor", lines: [
      "Here are three open chords, each major and then minor: E and Em, A and Am, D and Dm. Press each chord box below to hear it, then play the pair on your guitar.",
      "In each pair one finger moves one fret lower, or lifts off: that note is the 3rd. Press Intervals under a chord box to see the 3 in the major chord turn into ♭3 in the minor one.",
      "Listen for the one note that changes while the others stay.",
    ], tool: { type: "chord-shapes", chords: ["E", "Em", "A", "Am", "D", "Dm"] }, after: [
      "Practice until you can switch each pair back and forth without looking at your hand.",
    ] },

    { type: "exercise", title: "2. Major or minor, by ear", lines: [
      "Press Play below to start the backing track. It plays the C and Cm chords, and each stays for one, two or three bars.",
      "Look away from the chord boxes and call out major or minor each time the chord changes, then look back to check.",
      "If you lose your place, wait for the next change and start again from there.",
    ], tool: { type: "backing-track", key: "c", chords: ["C", "C", "Cm", "Cm", "C", "Cm", "Cm", "C"], style: "ballad", bpm: 70 } },

    { type: "exercise", title: "3. The two 3rds on their own", lines: [
      "A major chord starts with a major 3rd and a minor chord with a minor 3rd. Here they are as two notes, one after the other.",
      "Press Start below to hear two notes. Pick M3 for a major 3rd, m3 for a minor 3rd or P5 for a 5th.",
      "If two answers sound alike, press Replay and ask yourself: is that the start of a major chord or a minor one?",
    ], tool: { type: "interval-ears", set: [3, 4, 7], dir: "up" }, after: [
      "Practice until you can name a 3rd without pressing Replay.",
    ] },

    { type: "h2", text: "Major and minor scales" },
    { type: "p", text: "Scales work the same way. From the same root, the minor scale is the major scale with three notes a fret lower: the 3rd, the 6th and the 7th. C major is C, D, E, F, G, A and B. C minor is C, D, E♭, F, G, A♭ and B♭." },

    { type: "exercise", title: "4. C major and C minor from one root", lines: [
      "Tap up the staff below from {{1}} to the high {{1}}: that's C major. The ringed notes are {{3}}, {{6}} and {{7}}.",
    ], tool: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", highlight: ["3", "6", "7"], mic: false },
    between: [
      "Now tap up this staff, C minor, from the same {{1}}. Its ringed notes, {{b3}}, {{b6}} and {{b7}}, are the three that sit one fret lower.",
    ],
    beside: { type: "staff", scale: "natural-minor-aeolian", key: "c", voice: "tenor", highlight: ["b3", "b6", "b7"], mic: false }, after: [
      "Practice until you can hear the major {{3}} and the minor {{b3}} in your head before you tap them.",
    ] },
    { type: "guide", slug: "major-and-minor-scales-guitar", text: "Want both scales on the guitar? This guide puts A major and A minor side by side on the whole neck." },

    { type: "h2", text: "Major key or minor key" },
    { type: "p", text: "A song in a minor key can use exactly the notes of a major key. G major is G, A, B, C, D, E and F♯, and E minor uses the same seven notes. What tells them apart is the chord the music comes to rest on: the G chord in G major, the Em chord in E minor." },

    { type: "exercise", title: "5. Where does it rest?", lines: [
      "Press Play below to start the backing track in G major. Listen for the chord where the music comes to rest, and call out \"home\" each time it comes round. Home is the G chord, a major chord.",
    ], tool: { type: "backing-track", progression: "three-chord", key: "g", style: "pop", bpm: 80 },
    between: [
      "Now press Play on the backing track below. The notes are the same, but it rests on the Em chord, a minor chord: the key is E minor. Call out \"home\" each time the Em chord comes round.",
    ],
    beside: { type: "backing-track", progression: "aeolian", key: "e", style: "pop", bpm: 80 } },
    { type: "p", text: "E minor is the relative minor of G major: same notes, a different home. On the guitar, a relative minor chord always sits in the same frets as its major chord, and the [CAGED guide](/learn/caged-system-guitar) shows where." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Take a song you play with a major chord in it and swap that chord for its minor. Listen to how the line changes.",
      "Slide the E and Em shapes up to the 3rd fret as barre chords: now they're the G and Gm chords, and the same finger still turns one into the other. More in [Movable chord shapes](/learn/movable-chord-shapes).",
      "Put on a song you like and listen for the chord it comes to rest on: major or minor?",
    ] },
    { type: "p", text: "You'll notice it first in songs you know: where a song turns darker, there's often a minor chord." },
  ],
};
