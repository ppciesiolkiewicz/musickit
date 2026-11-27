# Articles

Public articles at `/learn/<slug>`, each written for one search a persona makes (task NEW21 in `tasks.txt`; who ranks for
what is on `/admin/dev/search`). Anyone can read them without logging in (`/learn` is in `MARKETING`, `src/lib/publicPaths.ts`),
and they are in the sitemap (`src/app/sitemap.ts`, dated by each article's `updated`). They are linked as **Learn** in the site
footer, as cards in the home page's **Try it now** section (`PlayersEnding`), from the FAQ ("Can I try attunr before I sign up?")
and from `/voice-care`, and the open tool pages link the guide on the same thing (`ui/GuideLink.tsx`, "Free guide: <title> →":
the `guide` prop of the lesson card, `src/components/theory/Lesson.tsx`, on /theory/chords, /theory/caged, /theory/scales and
/theory/metronome-drone, and over the major, natural minor and pentatonic scale pages in every key, `GUIDES` in
`src/app/theory/scales/[slug]/[key]/page.tsx`). `/learn` lists them as cards, then the join card. Each topic has its own page,
`/learn/guitar`, `/learn/singing` and `/learn/theory` (`topics.ts`, `TOPIC_PAGES`: its title, intro and search title, written
for a broader search than one article; the pages are `src/app/learn/<topic>/` over `src/app/learn/_topic.tsx`), listing the
topic's articles, with its own link preview and JSON-LD (`topicJsonLd`: a CollectionPage and the breadcrumb Home › Learn ›
the topic), and in the sitemap, dated by the newest of its articles.

An article does what the app's pages do: it ends in something to sing or play. Its exercises are the plan's own tools (`Tool`
from `features/plan/ui/Tool`), set up in the article the way a seed exercise sets them up, drawn on the page with the mic and
the drone, so a visitor practises without an account (the `/theory` tool pages need a login). A page with singing tools has the
demo plans' **Your voice** picker (`VoicePicker`) over them and the mic note under its intro.

## Where things are

- The `article-voice` skill (`.claude/skills/article-voice`): how the articles sound, on top of `teaching-voice`, with its `version` (`ARTICLE_VOICE_VERSION`). Course sections written in this style use it too.
- The Labels selector, Intervals or Solfège (`ui/ArticleLabels.tsx`), sits at the bottom of every article with dots (a tool, the `names` chart or notes in the text), above the updated date, with "It's okay to go with your feeling now" and a link to `NAMES_ARTICLE`. Every dot on the page, staffs included, starts as `articleLabels` (the article's `labels`, else Intervals for a guitar article and Solfège for any other), whatever the reader's Labels setting; picking one switches this page only.
- `model.ts`: `Article` (title, search title and description, intro, `updated`, `sings`, `topics` (Singing, Guitar, Theory: `TOPICS`), `blocks`) and `ArticleBlock`: `p`,
  `h2`, `list`, `care` (the plan's care line, `CareLine`), `figure` (a photo in `public/images/learn` with its caption and the credit its licence asks for), `guide` (another guide's card, after its line), `names` (`ui/NamesChart.tsx`: one octave of a piano from Do, each key with its interval and solfège name, Play to run up it, and the same as a table with each interval's full name; with `octaves`, more octaves from the C below middle C, the names coming round again from each Do, no table, scrolling sideways on a phone; with `on: "guitar"`, `ui/NamesNeck.tsx`: frets 0 to 12 in standard tuning, every note named from C with the piano's interval and colour), `chord-chain` (`ui/ChordChain.tsx`: chord boxes in a grid, each with a label above it ("C – A shape") and exact `frets` as `chord-shapes` writes them, wider than the column on a wide screen: one chord through its shapes), `chord-finder` (`ui/ChordFinder.tsx`: a search box and quick chips; type a major or minor barre chord to see the barre and its easier chords as chord boxes, from `barreAlternatives` in `alternatives.ts`) and `exercise` (a heading, its lines, the tool, lines after it; `chain`, a chord through its five CAGED shapes as a `chord-chain` worked out from `cagedBoxes` (`islandChord`, or `barreChord` with `barre`), with a Chord selector over it when it names more than one chord, after the tool and `between`; `beside`, a second tool under the first, for two scales compared; `key`, what its own notes count from when its tool has no key, never lent to another block; `parts`, smaller steps at the end under their own subheading, each with lines and a tool: "Move it: B7 to C7"). Text
  takes `**bold**`, `[label](href)` and `_care line_` (`Inline` in `ui/ArticleView.tsx`), and explained words: `marks.ts`
  (`markArticle`) runs the plan's glossary (`explain()`, `GLOSSARY` in `features/course/glossary.ts`) over the article's
  paragraphs, lists, care lines and exercise lines, each word marked once per article (a string's name, `every` in `GLOSSARY`, at every use) and never inside a link or a heading;
  its note links the term's public article (`article` in `GLOSSARY`) when it has one, never the course, which needs a login. Titles (an exercise's and a part's) are read on their own (`markTitle`), so a word is explained in every title that names it. A word the glossary marks wrongly (a verb such as
  "beat" or "skip") is reworded in the article, not dropped from the glossary. Chord names in the text (`chordNames.ts`, `splitChords`) open their chord box when pointed at (`ChordName`); a bare letter before "string", before a key word ("C minor pentatonic"), before ", the" (a note being named) or after "low"/"high" is left alone, and so is "A" the word. Titles and headings stay plain text, chord names too, so each reads as one line to a search engine. `ArticleSeed`: what an article was
  written from.
- A `guide` block puts another guide's /learn card in the text, after a line that says why, where the reader may need it first (the intervals guide where intervals first come up). Only what the article leans on, not every guide it mentions.
- `content/<slug>.ts`: one article each. `index.ts`: `ARTICLES`, in the order `/learn` lists them, and `articleOf`.
- `seeds/<slug>.json`: the article's seed info: the search it is written for, the persona, the date, the model, the versions
  it was written to (the teaching documents', `DOC_VERSIONS`, and the voice's, the `article-voice` skill), the author's own notes verbatim, the library
  blocks it reuses, the calculator runs, the sources read, and what is still open. Rewrite the article from it when the rules change.
- Tools as long as the neck (`WIDE` in `ui/ArticleView.tsx`, today `caged-neck`) reach out past the column into the spare room on a wide screen (`bleed`), on their own in an exercise or a one-tool `row`; none on a phone.
- `ui/PlayerControls.tsx`: the `player` block: the sing-along player's controls (Staff or Piano roll, Tune, Chords and Click, the loop, Full screen, Accuracy under the settings button), each drawn inline as it looks on the screen. Written once here, placed by a singing article before its first run.
- `author.ts`: `AUTHOR`, Pio's name, photo and note, shown in the join card and on `/about` (`src/app/about/page.tsx`, a ProfilePage), and `authorJsonLd`, the Person every article's structured data names as its author (`jsonLd.ts`).
- `ui/LearnList.tsx`: the cards with the topic links over them (All to /learn, #Singing, #Guitar, #Theory to each topic's page, the page's own one lit): links, not a filter, so a search engine finds the topic pages. Each card (`ui/ArticleCard.tsx`) shows its topic tags.
- `ui/TempoTool.tsx`: a sung tune or run (melody-singer, run-singer) with a Tempo selector over it, 40, 60, 80 or 90 bpm (`ARTICLE_TEMPOS`), starting on the tempo the article wrote (40).
- `art.ts`: `articleArt(slug)`, the article's picture, `public/images/learn/art/<slug>.svg` (1200 × 480, no words in it), drawn by
  `scripts/learn-art.mjs` (`node scripts/learn-art.mjs public/images/learn/art`), one function per slug; a new article needs one
  there (`art.test.ts` checks). It is the small picture on the article's card, the frameless picture under its title (`ui/ArticleHero.tsx`: wider than the column, pulled up behind the intro, its edges fading into the page; the fade is `.article-hero` in `src/app/decor.css`) and the
  top of its link preview.
- `ui/ArticleCard.tsx`: an article as a card: title, intro, its picture beside them, how many exercises it has (or how many minutes it takes to read, from
  `stats.ts`, `articleStats`), **Uses your mic** when it `sings`, and **Read**. On `/learn` and under each article's **More guides**.
- Each article page has **All guides** over its title, back to `/learn` (`PageShell`'s `back`).
- `ui/ArticleView.tsx`: `ArticleBody`, the blocks with their tools, Your voice picker and Labels selector, which the course draws too for a section written in this style (`CourseArticle` in `features/course/model.ts`, files in `features/course/lessons/`, shown with its updated day and time); and `ArticleView`, the /learn body, ending on the updated date, `JoinCard` (Pio's photo and note from `author.ts`, `AUTHOR`: who writes the articles and why attunr exists, with **More about me** to `/about`; then the line asking a reader to join, and **Start your plan** to `/plan`, the home page's main button; `/learn` shows it too) and **More guides** (two other articles' cards and **All guides** back to `/learn`). Pages: `src/app/learn/page.tsx`, `src/app/learn/[slug]/page.tsx`. Both draw the home and demo pages' glass shapes and side glows behind the column (`GlassShapes` as the shell's `decor`), and each exercise and the join card are `metal-panel` cards.
- Search and shared links: `src/app/learn/[slug]/page.tsx` gives each article its own `openGraph` and `twitter` (left out, a page
  takes the root layout's, the home page's title with it) and its JSON-LD, `jsonLd.ts` (`articleJsonLd`: an `Article` published
  by the root layout's `#organization`, and the breadcrumb Home › Learn › the article). `opengraph-image.tsx` beside it draws the
  link preview: the article's picture over its title, and, when the article `sings`, the line that it is sung on the page.
- `articles.test.ts`: unique slugs, each glossary word marked once per article with the text kept, the cards' exercise counts, a seed file per article, every tool accepted by the plan's parser (`parseTool`), a search
  description of 160 characters or less, the JSON-LD, `/learn/` links to articles that exist, and "practice", never "practise".

## The articles

- `pitch-matching-exercises`: live feedback and why a slightly flat or sharp note matters, looking after your voice, set-up, then
  five exercises: one note over the drone, the siren to Sol, two agility warm-ups (Do Re Do, Do Mi Do… and Do Re Do Mi Do Fa Do
  Sol, then down to Do) as runs of the runs book (`out-from-do` in `RUN_STAGES`, also the library blocks `voice-warm-up-agility-*`), and hear it and sing it back (`interval-ears`).
- `vocal-warm-ups`: a five-minute routine from the warm-up blocks: breathe in, hold, breathe out; a hiss then a buzz; lip rolls
  down and as a siren (saying plainly that the note and the mic don't matter, the buzz does); hum, then open.
- `scale-degree-feelings` ("Learning music theory as a way of naming feelings"): music is relative, so each note of the scale
  has a feeling that comes back in any key, named by its scale degree or its interval; the same E as Mi in C major and La in
  G major; how each note feels to Pio, and holding a note over a drone like a yoga pose. Then four exercises: each note over
  the C drone, the same in A (staff with a drone), Mi and Sol from Do in C, F or A (`interval-singer`), and naming M2, M3,
  P5 or P8 by ear (`interval-ears`).
- `intervals-and-solfege`: every note from Do to the Do above named both ways (the `names` chart), how to read the names (R, the numbers, ♭, p), three octaves to show the names repeat from each Do (`names` with `octaves: 3`), then naming m3, M3, P4 and P5 by ear (`interval-ears`) and singing Me, Mi and Sol from Do (`interval-singer`). The guitar articles' Labels selector links here.
- `major-and-minor-chords` ("Major and minor: what's the difference?"): the basic one. One note, the 3rd, moves a fret: E/Em, A/Am, D/Dm as chord boxes (Intervals shows 3 against ♭3), then C and Cm by ear over a backing track, M3 or m3 (`interval-ears`), C major and C minor staffs with the three notes that differ ringed, and G major or E minor by the chord the backing track rests on, linking the CAGED article for the relative minor. The glossary's Major and Minor link here.
- `major-and-minor-scales-guitar`: part 1 of a series on one key all over the guitar neck (CAGED in one key, task NEW22). A minor and
  A major one above the other (minor on top, A major each exercise's `beside`), with two **islands** each (the scale-neck's
  `islands`, every other note faded, with the tool's key, `IslandLegend`, under each neck): the 1st, 4th and 5th framed in the same
  places in both, then ♭7 1 2 against 7 1 2, every A circled in red, an Island button to hear each group. It opens with four intervals from one A (2nd, 4th, 5th, octave) as `row`s of small necks, and ends with the A minor and A major pentatonic scales: whole necks, islands, then islands from one A to the next. `frets: 12` for the page.
- `scale-degrees-guitar-any-key`: part 2. Do Re Do as the smallest island, in A minor and then in E minor (Island 1 on the
  same frets, one string lower), then ♭7 1 2 in E minor; links back to part 1 and to `scale-degree-feelings`.
- `caged-system-guitar`: the basic CAGED article (the series' "CAGED position by position"), major chords first, then minor, each in the same four steps: the five open chords (the minor ones Cm, Am, Gm, Em, Dm, the Cm and Gm with `frets`); the neck map with only the islands, each open chord's fretted notes moved up (`caged-neck` `islands: "only"`, C, then Am); one chord through its five shapes as chord boxes with arrows, a Chord selector over them (the exercise's `chain`, C, E, G, A, then Am, Em, Dm); and the whole chord: the full neck map with the islands framed, then the barre chords as a `chain` with `barre`. The Am chord comes in as the C chord's relative minor, its shapes one CAGED letter on in the same frets. The glossary's CAGED links here. Next in the series (not written): how to find chords for the scale using CAGED.
- `barre-chord-alternatives`: easier chords for a barre, opening with a `chord-finder` (type a major or minor chord, see its barre and easier chords from `alternatives.ts`, `ui/ChordFinder.tsx`). Each exercise is `chord-shapes` with `frets`, and every shape that moves gets a "Movable shapes" part: Fmaj7 for F with a strum-along, then Plain F (the high e left out) and F, G, A; B7 for B, then C7 (the open B string pressed); minor barres on the top four strings (the open Am shape moved up), Bm, Cm, C♯m; a bass fill on the free low E and A strings played on the neck (a `guitar-play-along` riff under Cm) over C minor pentatonic position 4; F and B triads, then the open D and Dm shapes moved to E, F♯, Em, F♯m; C9, D9, E9; Fmaj7 on the low E with four fingers (`frets` with its fingering after a bar), Gmaj7, Amaj7; the m7 drop 3 shape on the low E, Fm7 with four fingers, then Gm7, Am7 (also in the chord finder for minor chords). It ends with a Summary, not "Make it your own" (the author's choice). Its chord boxes are drawn three to a row and centred (`BIG_CHORDS` in `ui/ArticleView.tsx`).
- `microphone-and-audio-interface-for-singing`: a Shure SM58 and a Focusrite Scarlett Solo, or a 2i2 to plug in more than one
  thing, why direct monitoring matters for singing, and how to plug it together. Not sponsored, and it says so.
