# Music styles: themes named after genres

## Intent

Music Kit's colour themes (Dark, Light, Funky, Modern, Sandstorm) become **styles named after music genres**: Funk, Rock, Blues, Surf Rock, Metal, Jazz, plus Plain. Picking a style should change the *vibe* of the landing page, not just its palette: photos, edge treatment, glows and highlights, metallic shine and headline font all change. It's a playful thing the product does, and we show it off a bit. It also hints at the style courses the business is building, some of which are coming sooner than others.

Reference mockup (throwaway, not production code): `.superpowers/brainstorm/6427-1792325248/content/styles-v8.html`. Open it in a browser; the picker switches styles live. It is the visual source of truth for each style's look.

## Goals

- Seven styles: **Funk** (default), **Rock**, **Blues**, **Surf Rock**, **Metal**, **Jazz**, **Plain**.
- Each style is defined in one place, and every setting is easy to change: palette, headline font, corner/edge treatment, glow, metallic shine, photo filter, photos, small copy touches.
- The landing page (`src/app/page.tsx`) takes on the full vibe of the style **in every section**, top to bottom: hero, story, course, bundles, sign-up form, lessons, "Practice that adds up" and the closing call to action. Copy and layout stay the same.
- Photos are hooked into the style: each style can swap the landing photos for genre-appropriate ones.
- The switcher button goes back to the **palette icon** and shows the **current style's name, set in that style's headline font**.
- **First visit:** a small bubble pops open under the switcher automatically.
- **Course status:** the four sooner style courses get a "coming soon" note.

## Non-goals

- No copy rewrites. Hero, story, bundles and lessons text stay as they are. The only new words are the small "in-between" touches listed below.
- No new layouts or sections.
- Every page other than the landing page (scales, looper, tuner, theory, cheatsheet, creator) follows the style's **colours only**: no font, radius, photo, flourish or shine changes. The switcher button still shows the style name in its font.

## Anti-goals

- The picker must not look themed or busy. It is a plain, neutral card that looks the same under every style (think of the smiley-face feedback kiosk by an airport toilet: big round buttons, nothing else).
- The picker never shows "later" or any course status.
- Style headline fonts must not reach body text, form fields or the tools' controls. Readability first.
- No style may break contrast. Text and the fretboard's degree colours must stay legible on every background.

## The styles

Values come from the mockup's `[data-style]` blocks. Fonts are Google Fonts loaded via `next/font/google`.

| Style | Palette | Headline font | Edges | Glow / highlight | Metallic shine | Photo treatment |
|---|---|---|---|---|---|---|
| **Funk** (default) | plum `#1a0b2e`, hot pink `#ff3ea5`, lime `#b6f23a` | Shrikhand | big round corners, pill buttons | neon bloom on the headline accent and primary button | slow disco sparkle across "you hear." | saturated, warm |
| **Rock** | near-black `#121110`, paper white, signal red `#ff3b1f`, yellow | Anton, uppercase | 2px corners, thick outlines, torn bottom edge on photos | none: hard offset shadows like a gig poster | hard white glint on the primary button | contrast up, film grain |
| **Blues** | midnight `#0d1330`, whiskey amber `#f0a63a`, blue | DM Serif Display | soft worn corners (~14px) | warm low lamp glow | brass gradient button | light sepia, smoky vignette, grain |
| **Surf Rock** (the one light style) | sand `#fdf3e1`, coral `#ff6f59`, turquoise `#14b8a6` | Pacifico | pill-round everything, arched photo crop | sunny offset text shadow, chunky 3D buttons | chrome trim on cards, like a 60s car | bright, slightly bleached |
| **Metal** | black `#070707`, steel, blood red `#e11d2a` | Pirata One | razor-sharp chamfered corners | hard red rim light | chrome gradient headline, steel frames | black and white, high contrast |
| **Jazz** | navy `#0a1020`, brushed gold `#d9b45f`, cream text | Cormorant Garamond, italic accent | crisp 2–3px corners, hairline double frames | subtle gold sheen | brushed-gold "you hear." | slightly desaturated |
| **Plain** | today's Dark theme, unchanged | Fraunces (today's) | today's | today's soft sky glow | none | none |

Body text stays Geist in every style.

**Plain is exactly today's landing page**: same colours, fonts, photos, corners, shadows and glow, with no divider, glint, shine or course note. Only the switcher button and the first-visit picker are new on it.

### Glint

On every style except Plain, a light glint sweeps once across the primary button shortly after load and again on hover. Its colour comes from the style (white for most, warm gold for Jazz and Blues).

### Small "in-between" touches (landing only)

- A thin divider between the hero and the next section, drawn in the style's own shape, with one short line of text:
  - Funk: wavy line, "on the one"
  - Metal: flat line with a jagged spike, "drop D"
  - Blues: a slightly wobbly hand-drawn line, "12 bars · I IV V"
  - Rock: a double thick rule, "turn it up to 11"
  - Jazz: a hairline double rule, "ii · V · I"
  - Surf Rock: curling waves, "drenched in spring reverb"
  - Plain: no divider
- The hero fretboard (`FretWalk`) keeps working as it does. Its dots take the style's shape (diamonds in Metal and Rock, circles elsewhere).

### Photos

The style-specific photos picked so far (Unsplash IDs, after "photo-"):

| Style | Photo | Shows |
|---|---|---|
| Funk | `1601148072347-4c63fe45bd33` | a hand on a bass, warm yellow light |
| Rock | `1576416066728-3a83469793b4` | guitarist in orange stage smoke |
| Blues | `1510915361894-db8b60106cb1` | hands on a warm-lit acoustic |
| Surf Rock | `1562859921-84bf2f962ad1` | a guitarist on the sand between surfboards |
| Metal | `1515890326200-a07ce46010a1` | black and white, long-haired guitarist on stage |
| Jazz | `1786207469194-56a839006771` | sunburst hollow-body in a dim room |
| Plain | today's photos | |

Alternates seen and liked: Metal `1751781529625-eb6329e52987` (headbang, B&W) and `1606614520047-8ad516d9d84b` (smoke silhouette); Jazz `1536047852989-10896cf70749`; Surf `1616533719060-a7fc492e9299` (amp and guitar on a sea wall); Rock `1499424017184-418f6808abf9`; Funk `1602900332980-6e6f13946a3c`.

## The switcher and the first-visit bubble

- **Button:** palette icon plus the style's name in its headline font (for example "🎨 *Funk*" in Shrikhand). It replaces today's settings-cog button in `ThemeSwitcher.tsx`. The full screen toggle stays in the same menu.
- **Picker:** a neutral light card (near-white, zinc greys, same in every style). Header: "👋 Just a quick one: your favourite style?" Below it, big round emoji buttons with labels underneath, in this order: Funk 🕺, Rock ⚡, Blues 🎷, Surf Rock 🏄, Metal 🤘, Jazz 🎺, Plain 🙂. A small "Not now" link sits at the bottom. The current style's button has a dark ring.
- **Clicking a button** applies the style straight away; the page reskins live.
- **Click-away and Escape** close the picker.
- **First visit:** the picker opens on its own. The page behind it is already in Funk, and the Funk button pulses a few times so the eye lands on it. **"Not now" and click-away switch the site to Plain.** If the visitor picks a style, that sticks. Once it has been closed, it never auto-opens again.

## Course status

- Funk, Surf Rock, Blues and Rock courses are coming sooner. Under the hero's "Early access" pill, a small line reads "Funk course: coming soon", with a glowing dot, using the current style's name.
- Metal, Jazz and Plain show nothing there. The word "later" appears nowhere.

## Constraints

- Next.js in this repo has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- Today's theming works by remapping Tailwind's colour scales per `data-theme` in `src/app/themes.css`. Every utility follows the theme, and that mechanism stays.
- The saved choice lives in `localStorage` under `musickit.theme` and is applied before first paint by `THEME_BOOT` in `ThemeSwitcher.tsx`. No flash of the wrong style.
- Photos load from the Unsplash CDN through `src/components/landing/Photo.tsx`, with the photographer credited on each photo.

## Decided by Claude (check these)

- **Old theme IDs map to new ones** for returning visitors: `dark` → Plain, `funky` → Funk, `light` → Surf Rock, `modern` → Plain, `sandstorm` → Plain. The old Light, Modern and Sandstorm themes go away.
- **The bubble auto-opens on any page with the switcher**, not just the landing page, until it has been closed once (a "seen" flag in `localStorage`).
- **Photo slots:** the style photo replaces the story-section photo (`practising`). The course-section photo (`couch`) takes the style's alternate: Funk `1602900332980-6e6f13946a3c`, Rock `1499424017184-418f6808abf9`, Blues `1508186736123-44a5fcb36f9f` (goldtop close-up), Surf `1616533719060-a7fc492e9299`, Metal `1751781529625-eb6329e52987`, Jazz `1536047852989-10896cf70749`. The teacher photos (`teacher`, `teacherTablet`, `teacherSmile`) stay in every style, because they show the lessons themselves. Any style may override any slot; the mechanism allows it.
- **Visitors with no saved style** (including today's returning visitors who never picked a theme) are treated as first-time visitors: they load in Funk and see the bubble once. `layout.tsx`'s default `data-theme` becomes Funk.
- **The "seen" flag** is set when the bubble is closed in any way: picking a style, "Not now", click-away or Escape. A visitor who leaves without touching it sees it again on their next visit.
- **The Wordmark keeps today's font** in every style. It gets its own font variable so the brand doesn't change with the style.
- Radius, edge, glow and font settings therefore need to be scoped to the landing page, not set globally on `:root` the way Funky and Modern set `--radius-*` today.
- **Reduced motion:** with `prefers-reduced-motion`, the glint, the sparkle and the Funk pulse are off.
- Emoji choices are mine (🎷 for Blues, 🎺 for Jazz).

## Left to the builder

- How style settings are structured in code: a style registry in TS, CSS custom properties per `[data-theme]`, or both. The aim is one place per style, easy to edit.
- How landing elements read edge, glow and shine settings: CSS variables, data attributes, or small per-style class maps.
- Full palette scales for each style (the mockup gives the key colours; derive the Tailwind 50–950 ramps like `themes.css` does today, checking contrast).
- Photographer names for the credits (look them up on each photo's Unsplash page).
- Whether the tools' theme menu in `LooperApp.tsx` needs any layout change for the wider button.
