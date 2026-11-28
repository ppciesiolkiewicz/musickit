import type { CourseArticle } from "../model";

/** Course section `hearing-changes`, written in the /learn articles' style. */
export const hearingChanges: CourseArticle = {
  updated: "2026-11-28T02:30",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "In G major the C chord steps away from home and the D chord pulls back to it (the [1 → 4 → 5 → 1](/course/5/one-four-five) section plays them). This section lets your ears do the work, with your eyes off the screen." },
    { type: "p", text: "Once you can hear when a chord changes, and where it went, you can follow a song's chords without a chord sheet, and join in on the right one." },

    { type: "exercise", title: "1. When the chord changes", lines: [
      "Press the Play button below to start the backing track in G. Each chord stays for one, two or three bars, so counting won't find the changes.",
      "Tap your knee each time the lit chord box shows a new chord.",
      "Listen for the bass jumping to a new note at that moment.",
    ], tool: { type: "backing-track", key: "g", numerals: ["I", "I", "IV", "IV", "IV", "I", "V", "V"], style: "pop", bpm: 65 }, after: [
      "Then look away and tap only when you hear the change. Look back to check the lit chord box.",
      "Practice until you tap on the change, not just after it.",
    ] },

    { type: "exercise", title: "2. Away and back", lines: [
      "The G chord is the 1st chord of G major, built on G, the home note. The C chord is the 4th chord, built on C, the 4th note of the scale. The D chord is the 5th chord, built on D, the 5th note.",
      "Press the Play button below to start the backing track: the G and C chords take turns, then the G and D chords. Call out 4 on every C chord and 5 on every D chord.",
      "Listen for how the C chord moves away from G, and how the D chord pulls back to it.",
    ], tool: { type: "backing-track", key: "g", numerals: ["I", "IV", "I", "IV", "I", "V", "I", "V"], style: "pop", bpm: 65 }, after: [
      "Once you call it as the chord arrives, look away from the chord boxes and call out the number before you look back.",
    ] },

    { type: "exercise", title: "3. The 4th or the 5th chord", lines: [
      "Press the Start button in the game below to hear two chords: the 1st chord, then the 4th or the 5th chord, in a new key each time. Pick IV for the 4th chord or V for the 5th chord.",
      "Press the Replay button below to hear the two chords again before you pick. Press the Next button for two new chords.",
    ], tool: { type: "interval-ears", kind: "change", level: 1 }, after: [
      "When the key changes, every chord is new, but the 4th chord still steps away and the 5th chord still pulls home.",
      "Practice until you know the answer before the second chord has faded.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Put on a song you know and tap your knee on every chord change. Then try to call out 4 or 5 on each one.",
      "Play the G, C and D chords along with the backing track in exercise 2, changing when you hear the change, without looking.",
      "Add the 6th chord: in G major it's the Em chord, built on E, the 6th note of the scale. It's the only minor chord of the four, so listen for the change where the sound turns minor.",
    ] },
    { type: "p", text: "First the moment of the change gets easy to catch. Then the 4th and the 5th chords start to sound like themselves in any song." },
  ],
};
