---
name: course-article
version: 14
description: Write or rewrite a section (article) of the course at /course - one file per section in src/features/course/lessons, written like a /learn article with live tools and exercises - fill in planned sections, keep the learning path (/admin/content/path) that points at it true, or edit an old section still written with course blocks. Use when asked to write a course article, lesson or section, fill a planned section, or point a glossary word at a new article.
---

# Course article

A course section is one page at `/course/<stage>/<section>`. It is written the way a /learn article is: the same blocks, the same live tools, the same voice. What it adds is its place in two orders: the course (the sections before and after it) and the learning path (the path's tracks that name it as their course page).

Load **article-voice** first (it loads **teaching-voice**). The prose is article-voice; each exercise's title and lines are teaching-voice text, as in a seed exercise.

## The file

- One file per section, `src/features/course/lessons/<slug>.ts`, exporting a `CourseArticle` (`model.ts`): `updated`, `blocks` (the articles' `ArticleBlock`s: `p`, `h2`, `list`, `care`, `exercise` with its tool, `row`, `guide`, …), `sings` when a tool uses the mic, optional `labels` and `frets`. The stage file imports it and passes it as `section(...)`'s last argument, with `[]` for the blocks. The page draws it with the articles' `ArticleBody` (`src/features/articles/ui/ArticleView.tsx`); `src/features/articles/README.md` says what each block draws.
- Model it on the articles in `src/features/articles/content/` and the sections already in `src/features/course/lessons/`.
- `updated` is the day and the time, Sydney: `TZ=Australia/Sydney date "+%Y-%m-%dT%H:%M"`, set when the section is written or rewritten. The /learn style is still changing: a section older than a style change is found by its `updated` and rewritten to it.
- Tools are set up as a seed exercise sets them up (the plan's parser reads them; `content.test.ts` checks), controls named by their label on the screen. Read the tool's props in `src/features/exercises/docs/docs.generated.json` or its `*.props.ts`; only use props listed there. Glossary words are marked on these pages as on /learn, so the text uses the word and doesn't define it.
- Links in the text: `[label](/course/<stage>/<section>)`, `/learn/<slug>` or a `/theory` page, all real (the test checks). A `guide` block puts a /learn article's card where the reader may need it first.

## Steps

1. **Read the neighbours.** Read the section before and after in course order, and the stage `intro`. The article may only assume what earlier sections taught, and opens from the one before it.
2. **Read the path.** Find the tracks whose course page is this section: `grep -n '"/course/<stage>/<slug>"\|course("<stage>", "<slug>")' src/features/plan/model/concepts.ts` gives the old concept ids in `OLD_COURSES`; the track in `src/features/plan/model/path.ts` that `merges` them is the one. Read its steps (name, level, `holds`) and the steps it lists in `after`. The section teaches the track's first steps, in the path's order: what the track's first step holds is the page's first exercise, and a step marked "after" another track's step is not assumed before the page has linked that track's course page. Look at `/admin/content/path?concept=<track id>` on the dev server: the node shows the section as planned now and written once you're done. If no track names the section, say so in your report.
3. **Find the library's blocks.** `mcp__musickit-library__find_blocks` (or `grep -l '"<track id>"' src/features/library/seed/blocks/*.json`) lists the seed exercises tagged with the track. Reuse their tool set-ups and wording where they fit, so the page and the plan practise the same thing the same way.
4. **Get the facts from the calculator.** Run `npm run -s theory -- …` for every key, chord, scale, position or fret you name or draw. Draw from its output, never from memory. If it can't answer, say so; don't guess.
5. **Write the page** as article-voice's "What every article has": the opening (why it matters, from the section before), care for voice or hands, two to four exercises with live tools in the path's step order, "Make it your own", one closing line on what gets easier. Keep it about as long as its neighbours.
6. **Keep the `about` line true.** It is one or two plain sentences on what the page teaches. The AI plan's link list shows it too.
7. **Glossary.** If this section now explains a glossary word better than the word's current `href`, repoint it. If it introduces a word a beginner won't know, add a `Term` (the first form is the name the AI prompt uses, `short` is one plain line) and run `glossary.test.ts`.
8. **Verify.**
   ```
   TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)
   $TSX --test src/features/course/*.test.ts src/features/devtools/model/path.test.ts
   npx tsc --noEmit 2>&1 | grep -v '^.next/'
   ```
   Then open `/course/<stage>/<section>` on the dev server: every tool draws, every note the text names stands out on it, and every control the text names is there with that label. Check `/admin/content/path` shows the track's course page as written. Run the **review-teaching-text** skill on the section before you call it done. If the dev server won't build because of another session's work, say so: don't claim the page was read in the app.

## Old sections written with course blocks

Most written sections still use the course blocks (`text`, `neck`, `chords`, `task`, `links`, …) in the stage files. To change one a little, edit it in place with the reference below. To rewrite one, write it as a new lessons file by the steps above and empty its blocks. Course block pages get no glossary (i) tips: define a word the first time the course uses it, or link to the section that does.

### Where things are

- `model.ts`: `CourseStage`, `CourseSection`, `Block`, `TopicId`, and `section(slug, title, topic, about, blocks)`. A section with no blocks is *planned*: only its `about` line shows.
- `build.ts`: `text(...paras)`, `neck(caption, from, to, dots, { paths, legend, window })`, `chords(caption, list)`, `strum(pattern, chords, caption)`, `melody(...)` with its notes from `tune(spec)`, `songs(...)`, `task(text)`, `links(explore, practise)`, and `visual(...)` for the other pictures in `visuals.ts`. Also `toneDot`, `toneDots`, `pianoKeys`, `path`, `PATH` colours, `MAJOR_SEMIS`, `MINOR_SEMIS` and the pitch constants `E G A B C D`. Read the signature in the file before you call a helper: this list goes stale.
- Stage files and URL slugs differ: `s0.ts` holds stages 1–4, `s1.ts` is stage 5 (Position 1), `s2.ts` is 6, … `s7.ts` is 11. Find a section with `grep -n 'section("<slug>"' src/features/course/stages/*.ts`.
- `glossary.ts`: explained words and the article each points to.
- `content.test.ts`: checks dots sit on the drawn frets, chord boxes exist, links are real, and written sections have text plus something to look at or do. `DONE` lists the stages whose content is written (all eleven today; a new stage's slug goes there once it is written).

### Writing in course blocks

The same steps 1, 4, 6, 7 and 8 hold. In place of step 5:

- Plan the part you change as text → picture → task, in pairs: a paragraph introduces an idea, the visual right after it shows it, and its caption says what to look at ("C: from Em, only the B string moves, up one fret"). One idea per visual. Use `paths` arrows for movement, and a `legend` when colours carry meaning.
- Name songs only as title and artist with chords (`songs`). Melodies in tab only for traditional or public-domain tunes.
- The `task` is a drill to play right now, with these exact chords or notes. Say what it trains, and when it's got in feel rather than counts.
- `links`: `explore` goes to `/theory/...` pages or other course sections that go deeper, `practise` goes to tools. Every href is a real page. Each `note` is a short clause.
