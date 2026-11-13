import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const DIR = join(process.cwd(), "src", "features", "settings");

test("the shared sections don't lean on the old scales settings bar", () => {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".tsx"))) {
    const code = readFileSync(join(DIR, f), "utf8");
    assert.ok(!code.includes("chordKit/ScaleSettings"), `${f} imports chordKit/ScaleSettings`);
  }
});

/** Every .ts/.tsx file under src but tests, as [path, source]. */
function sources(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push([p, readFileSync(p, "utf8")]);
    }
  };
  walk(join(process.cwd(), "src"));
  return out;
}

test("no page builds its panel from the old scales-shaped bar", () => {
  for (const [p, code] of sources()) {
    for (const old of ["ScaleSettingsBar", "WithSettings", "BarRow", "onTonic={noTonic}", "keys: false"]) {
      assert.ok(!code.includes(old), `${p} still has ${old}`);
    }
  }
});

test("a tool that draws the sliders button can hand its settings to the page", () => {
  for (const f of ["warmUpBar.tsx", "lip-roll/index.tsx", "voice-hill/index.tsx", "interval-singer/index.tsx", "sing-along/SingAlong.tsx"]) {
    const code = readFileSync(join(process.cwd(), "src/features/exercises/basics", f), "utf8");
    assert.match(code, /\bhostSettings\b/, `${f} has no hostSettings`);
  }
  for (const [p, code] of sources()) assert.ok(!code.includes("components/practice/ToolSettings"), `${p} imports the old ToolSettings`);
  for (const f of ["lip-roll/settings.tsx", "voice-hill/settings.tsx"]) {
    const code = readFileSync(join(process.cwd(), "src/features/exercises/basics", f), "utf8");
    assert.ok(!code.includes('"rows"'), `${f} still has the rows look`);
  }
});

/** Each tool page that got the panel: its page file and the component that renders the `SettingsPanel`. The circle of fifths has none: its key is picked on the circle and its one setting, the volume, sits beside it. */
const PANEL_PAGES: [page: string, component: string][] = [
  ["src/app/theory/ears/page.tsx", "src/components/practice/EarGame.tsx"],
  ["src/app/theory/notes/page.tsx", "src/components/practice/NoteGame.tsx"],
  ["src/app/theory/singing/breathing/page.tsx", "src/components/theory/singing/BreathingApp.tsx"],
  ["src/app/theory/tune-by-ear/page.tsx", "src/components/theory/TuneByEar.tsx"],
  ["src/app/theory/piano/page.tsx", "src/components/theory/piano/TheoryPiano.tsx"],
  ["src/app/theory/chords/page.tsx", "src/components/chordKit/ChordKit.tsx"],
  ["src/app/tuner/page.tsx", "src/features/tuner/Tuner.tsx"],
  ["src/app/theory/metronome-drone/page.tsx", "src/app/theory/metronome-drone/page.tsx"],
  ["src/app/theory/rhythm/page.tsx", "src/app/theory/rhythm/page.tsx"],
  ["src/app/theory/backing/page.tsx", "src/app/theory/backing/page.tsx"],
];

test("each tool page has the full frame and a settings panel", () => {
  for (const [page, component] of PANEL_PAGES) {
    assert.match(readFileSync(join(process.cwd(), page), "utf8"), /<PageShell[^>]*\sfull[\s>]/, `${page} has no full frame`);
    assert.match(readFileSync(join(process.cwd(), component), "utf8"), /<SettingsPanel\b/, `${component} renders no SettingsPanel`);
  }
});

/** A module path from an `@/` import, to its file: the .tsx/.ts itself or its folder's index. */
function resolve(spec: string): string | null {
  const base = join(process.cwd(), "src", spec.slice(2));
  for (const f of [`${base}.tsx`, `${base}.ts`, join(base, "index.ts"), join(base, "index.tsx")]) {
    try { readFileSync(f); return f; } catch { /* next */ }
  }
  return null;
}

/** The page's own source, the files it imports by `@/`, and what those index files re-export, one level down. */
function reach(file: string): string {
  const code = readFileSync(file, "utf8");
  let all = code;
  for (const m of code.matchAll(/from "(@\/[^"]+)"/g)) {
    const f = resolve(m[1]);
    if (!f) continue;
    const dep = readFileSync(f, "utf8");
    all += dep;
    if (/index\.tsx?$/.test(f)) {
      for (const r of dep.matchAll(/from "\.\/([^"]+)"/g)) {
        for (const ext of [".tsx", ".ts"]) {
          try { all += readFileSync(join(f, "..", r[1] + ext), "utf8"); } catch { /* next */ }
        }
      }
    }
  }
  return all;
}

test("a full-width page always has a settings panel (the studio's own panel aside)", () => {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "page.tsx") pages.push(p);
    }
  };
  walk(join(process.cwd(), "src", "app"));
  const studio = ["note/[slug]/page.tsx", "teachers/studio/page.tsx"];
  const full = pages.filter((p) => /<PageShell[^>]*\sfull[\s>]/.test(readFileSync(p, "utf8")) && !studio.some((s) => p.endsWith(s)));
  assert.ok(full.length >= 21, `only ${full.length} full pages found`);
  for (const p of full) assert.match(reach(p), /<SettingsPanel\b/, `${p} is full width with no SettingsPanel`);
});

const src = (f: string) => readFileSync(join(process.cwd(), "src", f), "utf8");

test("a tour step inside a folded panel opens it (the tour asks, the panel listens)", () => {
  assert.match(src("components/ui/organisms/Tour/Tour.tsx"), /dispatchEvent\(new Event\(TOUR_REVEAL/);
  assert.match(src("components/ui/organisms/SettingsPanel/SettingsPanel.tsx"), /addEventListener\(TOUR_REVEAL/);
});

test("the tuner's meter comes first on a phone: its panel starts folded there", () => {
  assert.match(src("features/tuner/Tuner.tsx"), /<SettingsPanel[^>]*\bfoldOnPhone\b/);
});

test("the lip roll draws Tone and Speed once, from LipRollSettings, also in the plan", () => {
  const code = src("features/exercises/basics/lip-roll/index.tsx");
  assert.ok(!code.includes('data-tour="lip-roll-options"'), "the inline Tone/Speed row is still there");
  assert.match(code, /<LipRollSettings[^>]*look="menu"/);
});

test("the chords page's lesson sits inside the panel layout", () => {
  assert.match(src("app/theory/chords/page.tsx"), /<ChordKit[^>]*\blead=/);
});

test("index exports every shared section", () => {
  const index = readFileSync(join(DIR, "index.ts"), "utf8");
  for (const name of ["KeyRow", "LabelsRow", "AccuracyRow", "MelodyViewRow", "VolumeRow", "PocketSection", "InputSection", "HeardNoteProvider", "ScaleFacts", "usePocketStatus"]) {
    assert.match(index, new RegExp(`\\b${name}\\b`), `index.ts does not export ${name}`);
  }
});
