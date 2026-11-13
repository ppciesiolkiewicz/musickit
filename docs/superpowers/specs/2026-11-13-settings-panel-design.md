# Settings panel everywhere, controls with their feature

2026-11-13. Branch `settings-panel` (worktree `.claude/worktrees/settings-panel`), from main at `89e8eab7`.

## Why

Every tool page should have one place for its settings, and that place should look and behave the same on every page:
a column on the right, or a block above the page (the player picks with the panel-position button, remembered app-wide).
Today some pages have the column (scales, CAGED, triads, arpeggios, double stops, singing, melodies, runs, intervals,
warm-ups), others build rows inline in the page (ear game, note game) or hide settings behind a sliders button on the
tool (`ToolSettings`: volume, accuracy, labels, melody view). The same setting lives in two places on some pages.

The code should make that easy to keep true: the panel is a layout piece that knows nothing about scales or singing,
and each tool's controls are written once, next to the tool, and drawn wherever the tool is hosted.

## Goals

- Every tool page has the settings panel (side or above, the existing `side:` variant and `data-settings` toggle).
- On a page, settings live only in the panel. The sliders button (`ToolSettings`) does not appear on a tool that sits in
  a page with a panel. The tool keeps what is pressed while practising: Start / Stop, Restart, Skip, the mic chip, Play.
- Exercise pickers stay in the page above the tool (Warm-ups' "What to practise", the ear game's mode choice). Rule:
  a choice that swaps what is being practised is a picker; a choice that tunes how it is practised is a setting.
- A generic panel component that only does layout. Shared sections (key, labels, accuracy, volume, play-along tools,
  input line) are separate components the page composes, not config flags.
- Each tool's own controls live in its feature folder as `<Name>Settings` with a `look` prop: `"bar"` (rows in the
  panel) or `"menu"` (sections of the sliders-button dropdown, for the tool embedded in the practice plan or another
  host with no panel). *(Call: `"rows"`, chip rows in a page, is dropped: with a panel on every tool page nothing
  draws it. `LipRollSettings` and `HillSettings` lose it.)*
- No visible change on pages that already have the panel, except where this doc says so.

## Non-goals

- No new settings, no changed defaults, no new storage keys for existing settings.
- Articles, the course, the plan page, account, login, FAQ, teachers and the studio/notes creator do not get the panel.
- The looper and the studio keep their own layouts.
- No redesign of the play-along tools (`PracticeBand` pocket view), the tuner or the backing-track player beyond moving
  their settings into the panel.

## Anti-goals (a failure even if it works)

- Two places to change the same setting on one page.
- A tool's controls duplicated: one copy for the page, one for the plan.
- The panel growing flags for one page's needs (`keys: false`, `pocket: false`, a dummy `onTonic`). Composition, not config.
- Tours that point at controls that moved (`data-tour` selectors that no longer match, step text that says "below"
  for something now on the right).

## Constraints

- Repo rules in `AGENTS.md` and the feature `CLAUDE.md`s: interface copy via `design:ux-copy` + "Words about the app";
  a control keeps one name on every page; keep feature `README.md`/`CLAUDE.md` true in the same commit.
- `src/components/ui` is the design system: import from `@/components/ui` only; each component in its own folder.
- `components/` must not import `features/` (dependency-cruiser warns). So the panel and shared sections that need
  no feature code go in `components/ui`; sections that need feature code (play-along tools from
  `@/features/instruments`, the mic input line, labels from `@/features/theory`) stay where they can import it — see
  "Where things live".
- The panel's layout is CSS-first (`side:` variant, `data-settings` on `<html>`, `SETTINGS_BOOT`), so no layout flash.
  Keep it that way.
- Phones: the panel is the existing folding bar at the top (folds itself on first scroll). Unchanged.
- Worktree: `next dev --webpack` (node_modules is a symlink), tests with the cached tsx.

## What was decided

### The panel

`SettingsPanel` in `src/components/ui/organisms/SettingsPanel` replaces `WithSettings` + the frame of
`ScaleSettingsBar`. It takes:

- `children`: the page content.
- `settings`: the panel body (sections and rows, composed by the page).
- `summary?`: the facts shown in the header at a glance (today: key, scale, labels, bpm, drone, what plays).
- `side?` (default true): may be a column on wide screens. False for an embedded host (the plan), where it is always
  the bar on top. (Today's `side={syncUrl}` on the scales index.)
- `criteria?`: today's `WithSettings` `criteria` (Triad quality, Strings and the like on triads, arpeggios, double
  stops, CAGED). Unchanged behaviour: a boxed panel at the top of the content while the settings are a column, joined
  to the panel body when they sit above or the page is embedded. Keeps `data-tour="scale-criteria"`. *(Builder-check
  call: kept as a slot so step 1 changes nothing on screen; whether these are pickers or settings is a later question.)*

It owns: the column vs above layout, the panel-position button, the Hide/Show fold, the phone auto-fold, the sticky
behaviour, `data-with-settings` (the page-width rule in `globals.css`), the `data-tour="scale-settings"` hook
(renamed `data-tour="settings"`, tours updated).

`WithSettings`' `HeardNote` provider (the input line lighting necks) is not layout: it moves to a small
`HeardNoteProvider` the scales pages wrap themselves in.

### Shared sections

Each is a component the page drops into `settings`. Rows use one row component (`SettingsRow`, today's `BarRow`:
label, optional (i) info, chips that wrap). Sections use `SettingsSection` (today's `BarSection`: optional title, rule
above).

| Section | Today | Becomes |
| --- | --- | --- |
| Key (+ scale picker) | built into `ScaleSettingsBar`, off with `keys: false` | `KeyRow` |
| Labels | built in, off with `labels: false` | `LabelsRow` |
| Play-along tools | built in, off with `pocket: false` | `PocketSection` (wraps `PracticeBand view="pocket"`) |
| Input line (mic) | `config.input` | `InputSection` |
| Filter | `config.filters` | `SettingsSection title="Filter"` composed by the page |
| Accuracy | `ToolSettings accuracy` (dropdown tiles) | `AccuracyRow` |
| Melody view | `ToolSettings view` | `MelodyViewRow` |
| Volume | `Volume` in `ToolSettings` | `VolumeRow` |

Each shared row takes a `look` like the tools' settings, so the same row draws in the panel (`"bar"`) and in the
sliders dropdown (`"menu"`, the `DropdownSection` + tiles they use today). `ToolSettings` becomes a thin dropdown that
composes these rows with `look="menu"`; it stays for hosts with no panel.

### Tools' own controls

Every tool (basic in `src/features/exercises/basics/*`, and the page tools: ear game, note game, tuner, rhythm, backing,
breathing, singing) exports `<Name>Settings` from its feature folder, next to its View, with:

- controlled props for each setting (value + onChange), no internal state, so the host owns the state;
- `look: "bar" | "menu"`;
- no layout of its own beyond rows: the host places it.

`LipRollSettings` and `HillSettings` (already in) are the pattern; they gain `"menu"`.

Saving: as today. Volume, accuracy, labels and melody view are app-wide and already saved, so they carry between a
page and the plan. A tool's own choices (lip-roll speed, hill place) belong to the host that holds them: the page's
state on a page, the View's own state in the plan. No new storage keys.

A tool View takes a prop that says its settings are hosted elsewhere (today `controls={false}` on the lip roll); when
set, it draws no sliders button. When not set (the plan), it draws `ToolSettings` with its own `<Name>Settings
look="menu"` in `more`.

### Pages

The page component composes: `SettingsPanel` with the shared sections it needs and the tool's `<Name>Settings
look="bar"`, the picker above the tool, the tool with its settings hosted. Page components get thin.

Pages that get the panel (they have none today): Chords, Circle of fifths, Ear game, Note game, Piano, Metronome &
drone, Rhythm, Backing tracks, Breathing, Tune by ear, Tuner. Each moves to the `full` frame when it gets the panel
(`PageShell` rule: `full` only with a panel).

Basics and Tunings are articles: no panel.

Metronome & drone, Backing tracks and Rhythm keep their tools as they are (tempo, key, style stay on the tool) and get a
panel without `PocketSection`: a second metronome or drone on the page would be two places for one setting. Their
panel holds what the tool doesn't (volume, labels where notes are named). Other new panel pages get `PocketSection`
only where the page plays in a key and a drone or band fits (the builder flags each one in the report).
*(Call made after the question went unanswered twice; easy to revisit per page.)*

Pages that have it get moved to `SettingsPanel` + sections, no visible change.

### Order

1. `SettingsPanel`, `SettingsRow`, `SettingsSection`, the shared sections; existing panel pages moved onto them; no
   visible change. `ScaleSettingsBar` and `WithSettings` deleted at the end of this step.
2. Shared rows get `look="menu"`; `ToolSettings` composes them. Tools inside a panel page stop drawing the sliders
   button; their volume/accuracy/labels/view go in the panel.
3. The 11 pages, one commit each, each pulling its controls into its feature's `<Name>Settings`.

## Follow-up, after this project

The singing scale page (`/theory/singing`, `SingingApp mode="scales"`) works like Melodies: the scale, up and then back
down, drawn in the sing-along player (`SingAlong`), so it gets play / stop, the mic, a loop over a part, staff or piano
roll, at the page's tempo. Tapping a note to hear it stays. Its own design, after the panel lands.

## Left to the builder

- Exact prop names beyond those above, file splits inside a component folder.
- For each of the 11 pages: which of its controls are pickers and which are settings, by the rule above. When a page
  has nothing to set but volume (possibly Circle of fifths, Chords), it still gets the panel with Volume and Labels if
  it shows note names; if that leaves the panel near empty, flag it in the report rather than inventing settings.
- Header `summary` facts per page.
- Tour step text that moves: rewrite with `design:ux-copy` + "Words about the app", report old → new.
