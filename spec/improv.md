# Music Kit — Improvisation

Page `/improv`. Ideas from Joseph Schillinger's System of Musical Composition, as exercises. Pure maths is in `src/lib/improv/schillinger.ts` (tested); sound and UI are in `src/components/improv/`. Nothing here imports the looper or chord kit.

- **Rhythm by interference.** Two pulses (2 to 9 against 2 to 9) in one bar of four beats. Three lines (each pulse and the resultant, whose notes are where either pulse sounds), a playhead, the resultant durations (3:2 gives 2+1+1+2), and a loop that plays on the audio clock. Each line can be muted.
- **Permuting a motive.** Pick a key and scale and 2 to 4 degrees. The page lists the motive, its rotations, retrograde and inversion (a mirror around the first note, in scale steps), and all orderings (up to 24). Click one to hear it on the app's piano.
- **Improv roulette.** A random key, scale, rhythm, motive and rule with a timer, an optional root drone and the resultant clicking. "Did it" counts a streak (best and total saved in localStorage `musickit.improv.stats`).
- **Name that rhythm.** An ear game: a one-bar resultant plays twice and you choose which two pulses made it.

Not built: scoring from the microphone, other Schillinger material (symmetric scales, melody generators), and playing the exercises through the looper.
