# Articles

Public articles at `/learn/<slug>`, each written for one search a persona makes (task NEW21 in `tasks.txt`; who ranks for
what is on `/admin/dev/search`). Anyone can read them without logging in (`/learn` is in `MARKETING`, `src/lib/publicPaths.ts`),
and they are in the sitemap (`src/app/sitemap.ts`, dated by each article's `updated`). They are linked as **Learn** in the site
footer, as cards in the home page's **Try it now** section (`PlayersEnding`), from the FAQ ("Can I try attunr before I sign up?")
and from `/voice-care`. `/learn` lists them as cards, then the
join card.

An article does what the app's pages do: it ends in something to sing or play. Its exercises are the plan's own tools (`Tool`
from `features/plan/ui/Tool`), set up in the article the way a seed exercise sets them up, drawn on the page with the mic and
the drone, so a visitor practises without an account (the `/theory` tool pages need a login). A page with singing tools has the
demo plans' **Your voice** picker (`VoicePicker`) over them and the mic note under its intro.

## Where things are

- `VOICE.md`: how the articles sound, on top of `teaching-voice`, with its `version` (`ARTICLE_VOICE_VERSION`).
- `model.ts`: `Article` (title, search title and description, intro, `updated`, `sings`, `blocks`) and `ArticleBlock`: `p`,
  `h2`, `list`, `care` (the plan's care line, `CareLine`), `figure` (a photo in `public/images/learn` with its caption and the credit its licence asks for) and `exercise` (a heading, its lines, the tool, lines after it). Text
  takes `**bold**`, `[label](href)` and `_care line_` (`Inline` in `ui/ArticleView.tsx`). `ArticleSeed`: what an article was
  written from.
- `content/<slug>.ts`: one article each. `index.ts`: `ARTICLES`, in the order `/learn` lists them, and `articleOf`.
- `seeds/<slug>.json`: the article's seed info: the search it is written for, the persona, the date, the model, the versions
  it was written to (the teaching documents', `DOC_VERSIONS`, and the voice's, `VOICE.md`), the author's own notes verbatim, the library
  blocks it reuses, the calculator runs, the sources read, and what is still open. Rewrite the article from it when the rules change.
- `ui/PlayerControls.tsx`: the `player` block: the sing-along player's controls (Staff or Piano roll, Tune, Chords and Click, the loop, Full screen, Accuracy under the settings button), each drawn inline as it looks on the screen. Written once here, placed by a singing article before its first run.
- `author.ts`: `AUTHOR`, Pio's name, photo and note, shown in the join card and on `/about` (`src/app/about/page.tsx`, a ProfilePage), and `authorJsonLd`, the Person every article's structured data names as its author (`jsonLd.ts`).
- `ui/TempoTool.tsx`: a sung tune or run (melody-singer, run-singer) with a Tempo selector over it, 40, 60, 80 or 90 bpm (`ARTICLE_TEMPOS`), starting on the tempo the article wrote (40).
- `ui/ArticleCard.tsx`: an article as a card: title, intro, how many exercises it has (or how many minutes it takes to read, from
  `stats.ts`, `articleStats`), **Uses your mic** when it `sings`, and **Read**. On `/learn` and under each article's **More guides**.
- `ui/ArticleView.tsx`: the body, ending on the updated date, `JoinCard` (Pio's photo and note from `author.ts`, `AUTHOR`: who writes the articles and why attunr exists, with **More about me** to `/about`; then the line asking a reader to join, and **Start your plan** to `/plan`, the home page's main button; `/learn` shows it too) and **More guides** (two other articles' cards and **All guides** back to `/learn`). Pages: `src/app/learn/page.tsx`, `src/app/learn/[slug]/page.tsx`. Both draw the home and demo pages' glass shapes and side glows behind the column (`GlassShapes` as the shell's `decor`), and each exercise and the join card are `metal-panel` cards.
- Search and shared links: `src/app/learn/[slug]/page.tsx` gives each article its own `openGraph` and `twitter` (left out, a page
  takes the root layout's, the home page's title with it) and its JSON-LD, `jsonLd.ts` (`articleJsonLd`: an `Article` published
  by the root layout's `#organization`, and the breadcrumb Home › Learn › the article). `opengraph-image.tsx` beside it draws the
  link preview: the title, the intro and, when the article `sings`, the line that it is sung on the page.
- `articles.test.ts`: unique slugs, the cards' exercise counts, a seed file per article, every tool accepted by the plan's parser (`parseTool`), a search
  description of 160 characters or less, the JSON-LD, `/learn/` links to articles that exist, and "practice", never "practise".

## The articles

- `pitch-matching-exercises`: live feedback and why a slightly flat or sharp note matters, looking after your voice, set-up, then
  five exercises: one note over the drone, the siren to Sol, two agility warm-ups (Do Re Do, Do Mi Do… and Do Re Do Mi Do Fa Do
  Sol, then down to Do) as runs of the runs book (`out-from-do` in `RUN_STAGES`, also the library blocks `voice-warm-up-agility-*`), and hear it and sing it back (`interval-ears`).
- `vocal-warm-ups`: a five-minute routine from the warm-up blocks: breathe in, hold, breathe out; a hiss then a buzz; lip rolls
  down and as a siren (saying plainly that the note and the mic don't matter, the buzz does); hum, then open.
- `microphone-and-audio-interface-for-singing`: a Shure SM58 and a Focusrite Scarlett Solo, or a 2i2 to plug in more than one
  thing, why direct monitoring matters for singing, and how to plug it together. Not sponsored, and it says so.
