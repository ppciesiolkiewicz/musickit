# Music Kit — Architecture

## Tech Stack

| Layer    | Technology            |
|----------|------------------------|
| Framework| Next.js 16 (App Router)|
| UI       | React 19, Tailwind CSS|
| Language | TypeScript            |
| Audio    | Web Audio API         |
| Theory   | @tonaljs/tonal        |
| Dev      | Turbopack             |

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout, fonts, metadata
│   ├── page.tsx        # Home page, renders Piano
│   └── globals.css     # Tailwind, theme
├── components/
│   └── Piano.tsx       # Main piano UI component
└── lib/
    ├── audio.ts        # Web Audio playback
    └── musicTheory.ts  # Tonal utilities, scale helpers
```

## Component Responsibilities

### `Piano` (src/components/Piano.tsx)

- Renders white and black keys for 2-octave view
- Manages state: `pressedKeys`, `viewOctave`, `scaleTonic`, `scaleType`, `showScaleHighlight`
- Handles keyboard events (keydown/keyup)
- Builds `keyCodeToNote` mapping from `viewOctave`
- Delegates to `audio` and `musicTheory` for sound and scale logic

### `audio` (src/lib/audio.ts)

- `playNote(noteName)`: Start oscillator for note
- `stopNote(noteName)`: Stop and release
- `stopAllNotes()`: Stop all active notes
- Uses `Note.get(noteName).freq` from Tonal for frequency

### `musicTheory` (src/lib/musicTheory.ts)

- `getScaleNotes(scaleName)`: Pitch classes in scale
- `isNoteInScale(noteName, scaleName)`: Chroma-based, enharmonic-aware
- `getScaleDegree(noteName, scaleName)`: 1–7 or 1–12
- `getChordNotes(chordName)`: Chord tones (available for future use)
- Exports `SCALE_OPTIONS`, `TONIC_OPTIONS`

## Data Flow

1. **Key Press** → `handleKeyDown` → `keyCodeToNote.get(code)` → `noteId` → `playNote(noteId)` + `setPressedKeys`
2. **Key Release** → `handleKeyUp` → `stopNote(noteId)` + `setPressedKeys` (remove)
3. **Octave Shift** → `setViewOctave` → recomputes `keyCodeToNote`, `displayedWhiteKeys`, `displayedBlackKeys`
4. **Scale Change** → `setScaleTonic` / `setScaleType` → recomputes `scaleNotes` → `isNoteInScale`, `getScaleDegree` for styling

## Key Constants

| Constant            | Value                          |
|---------------------|--------------------------------|
| White key width     | 48px                           |
| Black key width     | 28px                           |
| White key height    | 170px                          |
| Black key height    | 105px                          |
| Total octaves       | 4 (C1–B4)                      |
| Displayed octaves   | 2                              |

## Dependencies

- **next**: App framework
- **react**, **react-dom**: UI
- **@tonaljs/tonal**: Note frequencies, scales, chords
- **tailwindcss**: Styling
