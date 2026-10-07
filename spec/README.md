# Music Kit — Specifications

This directory contains the formal specifications for the Music Kit application.

## Documents

| Document | Description |
|----------|-------------|
| [Overview](overview.md) | High-level product description and goals |
| [Features](features.md) | Detailed feature specifications |
| [Keyboard Mapping](keyboard-mapping.md) | Keyboard-to-piano key mapping specification |
| [Architecture](architecture.md) | Technical architecture and component structure |
| [Guitar tools](guitar-tools.md) | Chord explorer, triads by string group, mode pages |

## Quick Reference

- **App**: Interactive piano playable via computer keyboard
- **Range**: 4 octaves (C1–B4), displayed 2 at a time
- **Audio**: Web Audio API with @tonaljs for frequencies
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS
