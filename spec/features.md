# Music Kit — Feature Specifications

## 1. Piano Display

### 1.1 Visible Range

- **Scope**: 2 octaves displayed at a time
- **Total Range**: 4 octaves (C1 through B4)
- **Keys per View**: 14 white keys, 10 black keys (24 keys total)

### 1.2 Octave Navigation

- **Shift Down** (`[` or button): Move view to lower octave range
- **Shift Up** (`]` or button): Move view to higher octave range
- **Available Ranges**: Octaves 1–2, 2–3, 3–4
- **Indicator**: Displays "Octaves X–Y" for current view

### 1.3 Key Labels

- Every key displays its **note name** (e.g., C1, D1, C#2, F2)
- **Playable keys** (13 per view) also display the **keyboard key** that triggers them (e.g., A, W, S)

---

## 2. Audio

### 2.1 Sound Engine

- **Technology**: Web Audio API
- **Oscillator Type**: Triangle wave
- **Frequency Source**: @tonaljs/tonal `Note.get(noteName).freq`
- **Polyphony**: Multiple notes can play simultaneously

### 2.2 Envelope

- **Attack**: ~10 ms
- **Sustain**: 20% gain while key held
- **Release**: ~150 ms decay when key released

### 2.3 Lifecycle

- AudioContext created on first user interaction (browser autoplay policy)
- All notes stopped when tab becomes hidden (visibility change)
- No stuck notes on tab switch

---

## 3. Scale & Music Theory

### 3.1 Scale Selector

- **Tonic**: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- **Scale Types**: Major, Minor (natural), Harmonic minor, Melodic minor, Pentatonic, Blues, Dorian, Mixolydian, Chromatic, None

### 3.2 Scale Highlighting

- **Toggle**: "Highlight scale" checkbox
- **In-scale keys**: Emerald tint, scale degree label (1–7 or 1–12 for chromatic)
- **Out-of-scale keys**: Dimmed when scale selected
- **Enharmonic Support**: C#/Db, F#/Gb, etc. matched correctly via pitch-class chroma

---

## 4. Visual Feedback

### 4.1 Key Press State

- **Pressed**: Amber highlight (amber-200 white, amber-600 black)
- **Transition**: 75 ms duration

### 4.2 Scale State

- **In scale**: Emerald gradient, degree numeral
- **Out of scale**: Reduced opacity when highlighting enabled
