# Music Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five colour themes with seven music styles (Funk default, Rock, Blues, Surf Rock, Metal, Jazz, Plain). The landing page takes each style's full look; every other page takes its colours only.

**Architecture:**
- A pure TS registry, `src/features/styles/styles.ts`, is the one place each style's settings live (label, emoji, course status, photos, divider). It is unit-tested.
- Colours stay on the existing `data-theme` remap of Tailwind scales in `themes.css`.
- The landing look lives in a new `landing-styles.css`, scoped under `.landing` per `[data-theme]`: fonts, radii, glow, shine, frames and photo filters.
- Per-style markup (photos, divider, course note) is server-rendered for every style and shown with CSS by `data-theme`. That way the boot script decides the style before paint, with no flash and no hydration mismatch.
- `ThemeSwitcher.tsx` becomes the palette button, the neutral picker and the first-visit logic.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching layout/fonts, per AGENTS.md), React 19, Tailwind 4, `next/font/google`, node test runner via tsx.

**Spec:** `docs/superpowers/specs/2026-10-18-music-styles-design.md`. The visual source of truth is the mockup at `.superpowers/brainstorm/6427-1792325248/content/styles-v8.html`; copy its `[data-style]` values.

## Global Constraints

- Style ids, labels and order: `funk` Funk, `rock` Rock, `blues` Blues, `surf` Surf Rock, `metal` Metal, `jazz` Jazz, `plain` Plain. Default `funk`.
- Emoji: Funk 🕺, Rock ⚡, Blues 🎷, Surf Rock 🏄, Metal 🤘, Jazz 🎺, Plain 🙂.
- Course "coming soon": funk, surf, blues, rock only. The word "later" appears nowhere.
- Plain is exactly today's landing page: the Dark palette, Fraunces, today's photos, corners, shadows and glow, with no divider, glint, shine or course note.
- Pages other than `/` get colours only: no font, radius, photo, divider or shine changes.
- The Wordmark keeps Fraunces in every style.
- Body text stays Geist everywhere. Style display fonts only go on headlines (`h1`, `H2`, card titles that use `DISPLAY` today) and the switcher label.
- Storage keys: `musickit.theme` (the chosen style) and `musickit.styleSeen` (`"1"` once the picker has been closed in any way).
- No migration. An unknown saved value counts as no choice, which means Funk plus the intro.
- `prefers-reduced-motion`: no glint, sparkle or pulse.
- Tests: run the cached tsx binary (`ls ~/.npm/_npx/*/node_modules/.bin/tsx`), not `npx tsx`, which hangs here. Ignore `^.next/` lines from `tsc --noEmit`.
- Dev server in a worktree: `npx next dev --webpack` (Turbopack fails in worktrees).

## Review Focus

1. A saved old value (`"dark"`, `"funky"`) or garbage → Funk, and the picker opens. Pinned in Task 1's tests.
2. `localStorage` throws (private mode or blocked) → the page renders in Funk, the picker opens and closes without errors, and nothing crashes. Pinned in Task 1's `readSaved` test with a throwing storage.
3. Plain differs from today's `/` → a reviewer sees a regression. Task 2 takes a baseline screenshot and Task 6 compares against it.
4. Phone width (360px): the picker's 4-column grid and the "Surf Rock" label in Pacifico must fit with no horizontal scroll. Checked in Task 6 at 360px.
5. Surf Rock (the only light style) on tool pages: text and degree colours must stay legible. Checked in Task 6 on `/looper` and `/theory/scales`.

---

### Task 1: Style registry

**Files:**
- Create: `src/features/styles/styles.ts`
- Test: `src/features/styles/styles.test.ts`
- Modify: `package.json` (append `src/features/styles/*.test.ts` to the `test` script)

**Interfaces:**
- Produces:
  - `type StyleId = "funk" | "rock" | "blues" | "surf" | "metal" | "jazz" | "plain"`
  - `STYLES: readonly Style[]` in picker order
  - `Style = { id: StyleId; label: string; emoji: string; courseSoon: boolean; photos: Partial<Record<PhotoKey, PhotoRef>>; divider: { text: string } | null }`
  - `PhotoRef = { id: string; alt: string; by: string; page: string }`
  - `DEFAULT_STYLE: StyleId = "funk"`
  - `THEME_KEY = "musickit.theme"`, `SEEN_KEY = "musickit.styleSeen"`
  - `isStyle(v: unknown): v is StyleId`
  - `resolveStyle(saved: string | null): StyleId`
  - `readSaved(storage: Pick<Storage, "getItem"> | null): { style: StyleId; chosen: boolean; seen: boolean }` (catches throws)
  - `styleAfterIntroDismiss(): StyleId` returns `"plain"`
  - `courseNote(id: StyleId): string | null`
  - `photoFor(key: PhotoKey, id: StyleId): PhotoRef | null` (null means use the default `PHOTOS[key]`)
- `PhotoKey` is imported as a type from `src/components/landing/Photo.tsx`.

- [ ] **Step 1: Write the failing tests**

```ts
test("ids and order", () => assert.deepEqual(STYLES.map(s => s.id), ["funk","rock","blues","surf","metal","jazz","plain"]));
test("labels", () => assert.equal(STYLES.find(s => s.id === "surf")!.label, "Surf Rock"));
test("resolveStyle: valid kept, old/garbage/null → funk", () => {
  assert.equal(resolveStyle("metal"), "metal");
  for (const v of ["dark", "funky", "light", "", "x", null]) assert.equal(resolveStyle(v), "funk");
});
test("readSaved: nothing saved → funk, not chosen, not seen", () => assert.deepEqual(readSaved({ getItem: () => null }), { style: "funk", chosen: false, seen: false }));
test("readSaved: old value → funk, not chosen", () => assert.equal(readSaved({ getItem: k => k === THEME_KEY ? "dark" : null }).chosen, false));
test("readSaved: storage throws → funk defaults", () => assert.deepEqual(readSaved({ getItem: () => { throw new Error("blocked"); } }), { style: "funk", chosen: false, seen: false }));
test("readSaved: seen flag", () => assert.equal(readSaved({ getItem: k => k === SEEN_KEY ? "1" : "jazz" }).seen, true));
test("intro dismiss goes plain", () => assert.equal(styleAfterIntroDismiss(), "plain"));
test("course notes: soon four only, never 'later'", () => {
  assert.equal(courseNote("funk"), "Funk course: coming soon");
  assert.equal(courseNote("surf"), "Surf Rock course: coming soon");
  for (const id of ["metal","jazz","plain"] as const) assert.equal(courseNote(id), null);
  assert.ok(STYLES.every(s => !JSON.stringify(s).toLowerCase().includes("later")));
});
test("photos: every non-plain style overrides practising and couch, plain overrides nothing", () => {
  for (const s of STYLES) {
    if (s.id === "plain") { assert.equal(photoFor("practising", "plain"), null); continue; }
    assert.ok(photoFor("practising", s.id)?.id); assert.ok(photoFor("couch", s.id)?.id);
    assert.notEqual(photoFor("practising", s.id)!.id, photoFor("couch", s.id)!.id);
  }
  assert.equal(photoFor("practising", "metal")!.id, "1515890326200-a07ce46010a1");
});
test("dividers: plain has none, others have the spec text", () => {
  assert.equal(STYLES.find(s => s.id === "plain")!.divider, null);
  assert.equal(STYLES.find(s => s.id === "jazz")!.divider!.text, "ii · V · I");
});
```

- [ ] **Step 2: Run, expect FAIL (module missing)**

Run: `$TSX --test src/features/styles/styles.test.ts`

- [ ] **Step 3: Implement `styles.ts`**

Copy these values from the spec:
- Photo ids: `practising` gets the spec's "Photos" table; `couch` gets the alternates listed under "Decided by Claude → Photo slots".
- Divider texts: Funk "on the one", Metal "drop D", Blues "12 bars · I IV V", Rock "turn it up to 11", Jazz "ii · V · I", Surf "drenched in spring reverb".

Look up each photographer's name and page on unsplash.com (search by the photo id). Write alt text that describes the photo.

- [ ] **Step 4: Run, expect PASS.** Then run the full `npm test` file list with `$TSX` and expect no new failures.

- [ ] **Step 5: Commit** `Styles: a registry of the seven music styles, their photos, dividers and course status`

---

### Task 2: Palettes, boot and default

**Files:**
- Modify: `src/app/themes.css` (rewrite)
- Modify: `src/app/globals.css:87`
- Modify: `src/app/layout.tsx:46`
- Modify: `src/components/ThemeSwitcher.tsx` (drop `THEMES` and the old `THEME_BOOT`; import from the registry)

**Interfaces:**
- Consumes: `STYLES`, `THEME_KEY`, `DEFAULT_STYLE`, `isStyle` from Task 1.
- Produces: `THEME_BOOT` (still exported from `ThemeSwitcher.tsx`). It sets `document.documentElement.dataset.theme` to the saved style if valid, and otherwise leaves the `funk` already on `<html>`.

- [ ] **Step 1: Baseline.** Before changing anything, start the dev server, set `localStorage["musickit.theme"]="dark"`, and save full-page screenshots of `/` at 1280px and 390px wide to the scratchpad as `baseline-desktop.png` and `baseline-phone.png`. Task 6 compares Plain against them.
- [ ] **Step 2: Rewrite `themes.css`.**
  - `:root, :root[data-theme="plain"]` = today's `dark` block, byte for byte.
  - One block each for funk, rock, blues, surf, metal and jazz. Remap the same scales (slate = neutral, sky = accent, plus the others the current blocks remap). Derive the 50–950 ramps from the mockup's key colours the way the current blocks do. Surf follows the current `light` block's inverted-scale approach.
  - Each block sets `--app-glow` and `color-scheme`.
  - No `--radius-*` in any block, because radii are landing-only (Task 3).
  - Delete the dark, light, funky, modern and sandstorm blocks.
- [ ] **Step 3:** In `globals.css:87`, change the `--lane-alpha` selector to `:root[data-theme="surf"]`. In `layout.tsx`, change `data-theme="dark"` to `"funk"`.
- [ ] **Step 4:** Rebuild `THEME_BOOT` from the registry: valid saved style → set it; anything else → leave `funk`. Keep it in try/catch.
- [ ] **Step 5: Verify.**
  - `npx tsc --noEmit | grep -v '^.next/'` → no output.
  - Load `/` with no saved value → Funk palette, no flash.
  - Set each style id in `localStorage` and reload `/looper` and `/theory/scales` → each palette applies and text is legible.
- [ ] **Step 6: Commit** `Styles: seven palettes replace the five colour themes; Funk is the default`

---

### Task 3: Fonts and landing style tokens

**Files:**
- Modify: `src/app/layout.tsx` (load fonts)
- Create: `src/app/landing-styles.css` (imported from `globals.css`)
- Modify: `src/components/landing/Display.tsx`
- Modify: `src/components/Wordmark.tsx`

**Interfaces:**
- Produces, on `.landing`, per `[data-theme]`:
  - `--style-display` (font-family)
  - `--style-display-case` (`none` or `uppercase`)
  - `--style-display-variation` (Fraunces' `"SOFT" 100, "opsz" 96` for Plain, `normal` elsewhere)
  - `--r-card`, `--r-btn`
  - `--style-glow` (text-shadow), `--style-btn-shadow`, `--glint` (colour or `transparent`)
  - `--photo-filter`, `--frame`, `--clip` (chamfer polygon or `none`)
- Produces utility classes for Task 4: `.ls-display`, `.ls-card`, `.ls-btn`, `.ls-btn-primary`, `.ls-photo`, `.ls-accent` (the "you hear." span), `.ls-glint`.
- `DISPLAY` in `Display.tsx` becomes `{ fontFamily: "var(--style-display, var(--font-display)), serif", fontVariationSettings: "var(--style-display-variation)", textTransform: "var(--style-display-case)" }`.

- [ ] **Step 1:** In `layout.tsx`, load Shrikhand, Anton, Pirata One, DM Serif Display and Cormorant Garamond (normal, italic, weights 500/600) and Pacifico with `next/font/google`. Use variables `--font-funk`, `--font-rock`, `--font-metal`, `--font-blues`, `--font-jazz` and `--font-surf`, with `preload: false` and `display: "swap"`. Add them to `<body>`'s className.
- [ ] **Step 2:** In `Wordmark.tsx`, use `var(--font-display)` explicitly. It already does, so check it doesn't read `--style-display`.
- [ ] **Step 3:** Write `landing-styles.css` with the tokens above for each style, values from the mockup's `[data-style]` blocks:
  - Plain's tokens reproduce today exactly: `--r-card: 1.5rem` (rounded-3xl), `--r-btn: 0.75rem` (rounded-xl), today's shadows, `--glint: transparent`, `--photo-filter: none`, `--clip: none`.
  - The `.ls-*` classes read only these tokens.
  - Under `prefers-reduced-motion`, `.ls-glint::after` and the shine animations are `animation: none`.
- [ ] **Step 4:** Update `DISPLAY` as in Interfaces.
- [ ] **Step 5: Verify.** `tsc` clean. On `/`, each style's headline shows its font. Pages that don't use `.landing` show no font change; the Wordmark is Fraunces in every style.
- [ ] **Step 6: Commit** `Styles: each style's headline font and landing edge, glow and shine tokens`

---

### Task 4: Apply the look across the landing page

**Files:**
- Modify: `src/app/page.tsx` (add `landing` to the root `div`; add `.ls-*` classes to every section's cards, photos and buttons)
- Create: `src/components/landing/StyleDivider.tsx`
- Create: `src/components/landing/CourseSoon.tsx`
- Modify: `src/components/landing/FretWalk.tsx` (dot shape)
- Modify: `src/app/landing-styles.css` (shine rules)

**Interfaces:**
- Consumes: `STYLES`, `courseNote` (Task 1); the `.ls-*` classes (Task 3).
- Produces:
  - `<StyleDivider />` renders every style's divider (SVG plus text), each wrapped in `data-style-only="<id>"`. The shapes come from the mockup's `FLOURISH` paths.
  - `<CourseSoon />` renders a note for each style where `courseNote(id)` isn't null, wrapped the same way.
  - CSS: `[data-style-only]{display:none}` and `:root[data-theme="X"] [data-style-only="X"]{display:revert}` for each style.

- [ ] **Step 1:** Add `landing` to `page.tsx`'s root `div`. Add the classes in every section, top to bottom:
  - `.ls-card` on each `rounded-3xl`/`rounded-4xl` card and on the join form.
  - `.ls-photo` on each `<Photo>`.
  - `.ls-btn` on CTAs, and `.ls-btn-primary .ls-glint` on primary CTAs (hero, bundle buttons, final CTA).
  - `.ls-accent` on "you hear.".

  Plain's token values make every class a no-op against today's styling.
- [ ] **Step 2:** Add the shine rules to `landing-styles.css`, from the mockup's "metallic shine" CSS: Metal chrome `h1` and steel frames, Jazz brushed-gold `.ls-accent`, Funk sparkle `.ls-accent`, Blues brass primary button, Surf chrome trim on `.ls-card`, Rock white glint.
- [ ] **Step 3:** Build `StyleDivider` and place it between the hero and the story section. Build `CourseSoon` and place it under the hero's early-access pill (`page.tsx:96`).
- [ ] **Step 4:** In `FretWalk.tsx`, give the note dots a class (`fret-dot`). In `landing-styles.css`, render them as diamonds under metal and rock: a `rect` swap, or `rx` 0 plus a rotate. Keep `dot-pop` and ripple working.
- [ ] **Step 5: Verify.** Click through all seven styles on `/` at 1280px. Each matches the mockup's character in every section, and Plain shows no divider, course note or glint. `tsc` clean.
- [ ] **Step 6: Commit** `Landing: every section takes the style's edges, glows and shine; dividers and course notes per style`

---

### Task 5: Per-style photos

**Files:**
- Modify: `src/components/landing/Photo.tsx`
- Modify: `src/app/page.tsx` (only if the `Photo` call sites change)

**Interfaces:**
- Consumes: `photoFor`, `STYLES` (Task 1).
- Produces: `Photo` props unchanged. Inside, for each `PhotoKey` it renders the default image (shown for Plain and for styles without an override) plus one image per override.
  - Each image is wrapped in `data-style-only` / `data-style-default`, so CSS shows exactly one, chosen by `data-theme`.
  - Every image gets `loading="lazy"` except the visible-on-load `priority` one, so hidden variants aren't downloaded.
  - Each image keeps its own credit caption.

- [ ] **Step 1:** Implement as above. CSS: `[data-style-default]` is shown unless the current theme has an override for that key. Mark the wrapper with `data-overrides="funk rock …"` and use `:root[data-theme="X"] [data-overrides~="X"] [data-style-default]{display:none}`.
- [ ] **Step 2: Verify.**
  - In DevTools' Network tab, on Funk, `/` downloads the Funk practising and couch photos and none of the other styles' photos.
  - Switching to Metal loads the Metal photos.
  - Plain shows today's photos.
  - The credits read correctly.
- [ ] **Step 3: Commit** `Landing: the story and course photos change with the style`

---

### Task 6: Switcher button, picker and first visit

**Files:**
- Modify: `src/components/ThemeSwitcher.tsx`
- Modify: `src/components/looper/LooperApp.tsx` (only if the wider button breaks its layout)

**Interfaces:**
- Consumes: `STYLES`, `THEME_KEY`, `SEEN_KEY`, `readSaved`, `styleAfterIntroDismiss` (Task 1); the style font variables (Task 3).
- Produces: `ThemeSwitcher({ className })`. The props are unchanged.

- [ ] **Step 1: Button.** Show the `palette` icon plus the current style's label. The label's font is `var(--font-<id>)`; Plain uses `var(--font-display)`. The current style comes from `useSyncExternalStore` on `data-theme`, as today.
- [ ] **Step 2: Picker.** A neutral card, fixed colours (`#fafafa` background, zinc borders and text; not theme tokens), copied from the mockup's `.bubble` and `.face`.
  - Header: "👋 Just a quick one: your favourite style?"
  - A 4-column grid of round emoji buttons with labels underneath, in `STYLES` order.
  - A "Not now" link.
  - The current style's button gets a dark ring.
  - The full screen toggle stays below, as today.
  - `role="dialog"` with `aria-label="Pick a style"`. The buttons use `aria-pressed`.
- [ ] **Step 3: Behaviour.**
  - Picking a style applies it with today's `applyTheme` fade, saves `THEME_KEY`, sets `SEEN_KEY`, and closes the picker.
  - On mount, if `!readSaved(localStorage).seen`, open in intro mode, where the current button pulses 3 times (the mockup's `ring` keyframes; off with reduced motion).
  - In intro mode, "Not now", click-away (pointerdown outside) and Escape apply `styleAfterIntroDismiss()`, save it, and set `SEEN_KEY`.
  - Outside intro mode, click-away and Escape only close. "Not now" is shown in intro mode only.
  - Wrap every storage call in try/catch.
- [ ] **Step 4: Verify.**
  1. Clear storage → `/` loads in Funk, the picker opens and Funk pulses. Click away → Plain, and on reload there's no picker and it's still Plain.
  2. Clear storage → pick Metal → Metal sticks after reload, with no picker.
  3. With storage blocked (DevTools → Application → block site data), the page renders in Funk and the picker opens and closes without console errors.
  4. At 360px wide: the picker fits, the "Surf Rock" button label fits the nav, and there's no horizontal scroll.
  5. Surf Rock on `/looper` and `/theory/scales` is legible.
  6. Plain at 1280px and 390px against `baseline-*.png` from Task 2: the only differences are the switcher button and the picker (closed for the comparison).
- [ ] **Step 5: Commit** `Settings: the palette button names the style in its own font; first visit asks your favourite style`
