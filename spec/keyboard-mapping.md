# Music Kit — Keyboard Mapping

## Design Principle

**One keyboard key = one piano key.** All 24 displayed piano keys have a dedicated keyboard key. Every key is playable.

## Full Key Mapping

### Octave 1 (lower octave of visible range)

| Keyboard Key | Note  |
|--------------|-------|
| 1            | C1    |
| 2            | C#1   |
| 3            | D1    |
| 4            | D#1   |
| 5            | E1    |
| 6            | F1    |
| 7            | F#1   |
| 8            | G1    |
| 9            | G#1   |
| 0            | A1    |
| -            | A#1   |
| =            | B1    |

### Octave 2 (upper octave of visible range)

| Keyboard Key | Note  |
|--------------|-------|
| Q            | C2    |
| W            | C#2   |
| E            | D2    |
| R            | D#2   |
| T            | E2    |
| Y            | F2    |
| U            | F#2   |
| I            | G2    |
| O            | G#2   |
| P            | A2    |
| [            | A#2   |
| ]            | B2    |

## Navigation Keys

| Keyboard Key | Action           |
|--------------|------------------|
| ← (ArrowLeft)  | Shift view down  |
| → (ArrowRight) | Shift view up    |

## Mapping Logic

The mapping is **view-dependent**. When the view shifts:

- **Octaves 1–2**: Number row plays C1–B1, letter row plays C2–B2
- **Octaves 2–3**: Number row plays C2–B2, letter row plays C3–B3
- **Octaves 3–4**: Number row plays C3–B3, letter row plays C4–B4

## Note ID Format

Notes use scientific pitch notation: `{pitch}{octave}` (e.g., `C#1`, `F2`). Sharps use `#` in IDs for compatibility with @tonaljs.
