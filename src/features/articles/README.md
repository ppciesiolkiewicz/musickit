# Articles

Public articles at `/learn/<slug>`, each written for one search a persona makes (task NEW21 in `tasks.txt`; who ranks for
what is on `/admin/dev/search`). Anyone can read them without logging in (`/learn` is in `MARKETING`, `src/lib/publicPaths.ts`),
and they are in the sitemap (`src/app/sitemap.ts`). `/learn` lists them.

An article does what the app's pages do: it ends in something to sing or play. Its exercises are the plan's own tools (`Tool`
from `features/plan/ui/Tool`), set up in the article the way a seed exercise sets them up, drawn on the page with the mic and
the drone, so a visitor practises without an account (the `/theory` tool pages need a login). A page with singing tools has the
demo plans' **Your voice** picker (`VoicePicker`) over them and the mic note under its intro.

## Where things are

- `model.ts`: `Article` (title, search title and description, intro, `updated`, `sings`, `blocks`) and `ArticleBlock`: `p`,
  `h2`, `list`, `care` (the plan's care line, `CareLine`) and `exercise` (a heading, its lines, the tool, lines after it). Text
  takes `**bold**`, `[label](href)` and `_care line_` (`Inline` in `ui/ArticleView.tsx`). `ArticleSeed`: what an article was
  written from.
- `content/<slug>.ts`: one article each. `index.ts`: `ARTICLES`, in the order `/learn` lists them, and `articleOf`.
- `seeds/<slug>.json`: the article's seed info: the search it is written for, the persona, the date, the model, the teaching
  documents' versions it was written to (`DOC_VERSIONS`), the voice asked for, the author's own notes verbatim, the library
  blocks it reuses, the calculator runs, the sources read, and what is still open. Rewrite the article from it when the rules change.
- `ui/ArticleView.tsx`: the body. Pages: `src/app/learn/page.tsx`, `src/app/learn/[slug]/page.tsx`.
- `articles.test.ts`: unique slugs, a seed file per article, every tool accepted by the plan's parser (`parseTool`), a search
  description of 160 characters or less, `/learn/` links to articles that exist, and "practice", never "practise".

## The articles

- `pitch-matching-exercises`: live feedback and why a slightly flat or sharp note matters, looking after your voice, set-up, then
  five exercises: one note over the drone, the siren to Sol, two agility warm-ups (Do Re Do, Do Mi Do… and Do Re Do Mi Do Fa Do
  Sol, then down to Do) as runs of the runs book (`out-from-do` in `RUN_STAGES`, also the library blocks `voice-warm-up-agility-*`), and hear it and sing it back (`interval-ears`).
- `vocal-warm-ups`: a five-minute routine from the warm-up blocks: breathe in, hold, breathe out; a hiss then a buzz; lip rolls
  down and as a siren (saying plainly that the note and the mic don't matter, the buzz does); hum, then open.
- `microphone-and-audio-interface-for-singing`: a Shure SM58 and a Focusrite Scarlett Solo, or a 2i2 to plug in more than one
  thing, why direct monitoring matters for singing, and how to plug it together. Not sponsored, and it says so.
