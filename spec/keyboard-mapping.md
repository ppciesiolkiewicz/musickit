# Music Kit — Keyboard Mapping

## Design Principle

**One keyboard key = one piano key.** Each physical key maps to exactly one note in the currently displayed range.

## Main Key Mapping

The 13 playable keys map to the first 13 notes of the visible 2-octave range (C through C of the next octave):

| Keyboard Key | White/Black | Note (Octaves 1–2) | Note (Octaves 2–3) | Note (Octaves 3–4) |
|--------------|-------------|--------------------|--------------------|--------------------|
| A            | White       | C1                 | C2                 | C3                 |
| W            | Black       | C#1                | C#2                | C#3                |
| S            | White       | D1                 | D2                 | D3                 |
| E            | Black       | D#1                | D#2                | D#3                |
| D            | White       | E1                 | E2                 | E3                 |
| F            | White       | F1                 | F2                 | F3                 |
| T            | Black       | F#1                | F#2                | F#3                |
| G            | White       | G1                 | G2                 | G3                 |
| Y            | Black       | G#1                | G#2                | G#3                |
| H            | White       | A1                 | A2                 | A3                 |
| U            | Black       | A#1                | A#2                | A#3                |
| J            | White       | B1                 | B2                 | B3                 |
| K            | White       | C2                 | C3                 | C4                 |

## Navigation Keys

| Keyboard Key | Action           |
|--------------|------------------|
| `[`         | Shift view down  |
| `]`         | Shift view up    |

## Mapping Logic

The mapping is **view-dependent**:

- When viewing Octaves 1–2: A–K play C1 through C2
- When viewing Octaves 2–3: A–K play C2 through C3
- When viewing Octaves 3–4: A–K play C3 through C4

Keys D2 through B2 (when viewing 1–2) are visible but not mapped to the 13-key set; they become playable when the view shifts up.

## Note ID Format

Notes use scientific pitch notation: `{pitch}{octave}` (e.g., `C#1`, `F2`). Sharps use `#` in IDs for compatibility with @tonaljs.
