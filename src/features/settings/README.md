# Settings

Every tool page has one `SettingsPanel` (`@/components/ui`): a column on the right on wide screens, or a bar above the
page (the panel-position button; one choice for the app). The panel is layout only. What goes in it is here, and each
tool's own controls are next to the tool (`<tool>/settings.tsx`, `<Name>Settings`).

Pickers (what is practised: Lip roll or The hill, Intervals or Chord quality, a chords tab, a drill) stay in the page
above the tool. Settings (how it is practised) go in the panel. A setting is in one place per page.

## Pieces

- `KeyRow`: the key chips, with `scale` the scale picker before them ("Scale" row). `keyAndScaleName` for the panel's `name`.
- `rows.tsx`: the app-wide settings, each saved for the whole app by its own hook: `LabelsRow`, `AccuracyRow`,
  `MelodyViewRow`, `VolumeRow` (and `Volume`, the speaker and slider).
- `PlayAhead.tsx`: `PlayAheadRow` and `usePlayAhead` (the staff, the singing pages, the lip roll).
- `savedSetting`: a setting kept in this browser and shared live, so a panel and the tool it hosts agree.
- `PocketSection`: the play-along tools (click, drone, drums, bass) as the panel's `tools`; `side` is the panel's own, so
  they stack in the column. `usePocketStatus` and `ScaleFacts` for the header facts.
- `InputSection` + `HeardNoteProvider`: the mic line; the note it hears lights on the necks inside the provider.
- `ToolSettings`: a tool's settings where there is no panel (the plan): the volume, then the rows in their "menu" look
  behind a sliders button.

Every row and every `<Name>Settings` takes `look`: `"bar"` rows of a `SettingsPanel`, `"menu"` sections of a sliders button.

## A page

```tsx
<HeardNoteProvider>                       {/* only with an InputSection */}
  <SettingsPanel name={...} summary={<ScaleFacts pocket={pocket} />}
    settings={<SettingsSection title="Settings" first><KeyRow .../><LabelsRow /></SettingsSection>}
    tools={<PocketSection keyPc={tonicPc} side onStatus={onPocket} lines={<InputSection />} />}>
    {/* the page's pickers, then the tool with hostSettings */}
  </SettingsPanel>
</HeardNoteProvider>
```

A tool that draws `ToolSettings` takes `hostSettings`: on a page it draws none of it and the page puts the same rows in
its panel. A page that is `full` in `PageShell` has a `SettingsPanel` (`settings.test.ts` checks every page).

On pages whose panel has `PocketSection` (the singing pages), the app's `VolumeRow` stays out of the panel and the tool
keeps its volume: the play-along tools have their own Volume, and two rows of that name would read as one.
